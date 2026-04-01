// ============================================================
// Personio XML → Webflow CMS Sync (Cloudflare Worker)
// ============================================================
// Holt offene Stellen von Personio XML-Feed und synchronisiert
// sie in eine Webflow CMS Collection.
//
// Secrets (via wrangler secret put):
//   WEBFLOW_API_TOKEN  - Webflow API Token
//   WEBFLOW_COLLECTION_ID - ID der Jobs-Collection
// ============================================================

// --------------- Config & Label-Mapping ---------------

const LABELS = {
  employmentType: {
    permanent: "Festanstellung",
    temporary: "Befristet",
    intern: "Praktikum",
    trainee: "Trainee",
    freelance: "Freelance",
  },
  seniority: {
    "entry-level": "Berufseinsteiger",
    experienced: "Berufserfahren",
    executive: "Führungskraft",
    student: "Student/Praktikant",
  },
  schedule: {
    "full-time": "Vollzeit",
    "part-time": "Teilzeit",
    "full-or-part-time": "Voll- oder Teilzeit",
  },
};

const PERSONIO_BASE_URL = "https://puespoek.jobs.personio.com/job";

// --------------- XML Parsing ---------------

function parseXML(xmlText) {
  // Lightweight XML parser fuer Cloudflare Worker (kein DOM verfuegbar).
  // Parst das Personio XML-Format in ein Array von Job-Objekten.
  const jobs = [];
  const positions = xmlText.split("<position>");

  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i].split("</position>")[0];
    const job = {
      personioId: getTag(pos, "id"),
      name: getTag(pos, "name"),
      office: getTag(pos, "office"),
      additionalOffices: getAdditionalOffices(pos),
      department: getTag(pos, "department"),
      recruitingCategory: getTag(pos, "recruitingCategory"),
      employmentType: getTag(pos, "employmentType"),
      seniority: getTag(pos, "seniority"),
      schedule: getTag(pos, "schedule"),
      yearsOfExperience: getTag(pos, "yearsOfExperience"),
      occupation: getTag(pos, "occupation"),
      occupationCategory: getTag(pos, "occupationCategory"),
      createdAt: getTag(pos, "createdAt"),
      jobDescriptions: getJobDescriptions(pos),
      salary: getSalaryInfo(pos),
    };
    jobs.push(job);
  }
  return jobs;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getTag(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? decodeEntities(match[1].trim()) : "";
}

function getAdditionalOffices(xml) {
  const block = xml.match(
    /<additionalOffices>([\s\S]*?)<\/additionalOffices>/
  );
  if (!block) return [];
  const offices = [];
  const officeRegex = /<office>([^<]*)<\/office>/g;
  let match;
  while ((match = officeRegex.exec(block[1])) !== null) {
    offices.push(match[1].trim());
  }
  return offices;
}

function getJobDescriptions(xml) {
  const descriptions = [];
  const descBlocks = xml.split("<jobDescription>");
  for (let i = 1; i < descBlocks.length; i++) {
    const block = descBlocks[i].split("</jobDescription>")[0];
    const name = getTag(block, "name");
    // CDATA-Inhalt extrahieren
    const valueMatch = block.match(/<value>\s*<!\[CDATA\[\s*([\s\S]*?)\s*\]\]>\s*<\/value>/);
    const value = valueMatch ? valueMatch[1].trim() : "";
    if (name && value) {
      descriptions.push({ name, value });
    }
  }
  return descriptions;
}

function getSalaryInfo(xml) {
  const block = xml.match(
    /<salaryInformation>([\s\S]*?)<\/salaryInformation>/
  );
  if (!block) return null;
  const min = getTag(block[1], "min");
  const max = getTag(block[1], "max");
  const currency = getTag(block[1], "currencyCode");
  const type = getTag(block[1], "type");
  if (!min && !max) return null;
  return {
    min: min ? parseFloat(min) : null,
    max: max ? parseFloat(max) : null,
    currency: currency || "EUR",
    type: type || "monthly",
  };
}

// --------------- Data Transformation ---------------

function cleanHtmlForWebflow(html) {
  // Webflow RichText unterstützt nur: h1-h6, p, ul, ol, li, a, strong, em, blockquote, figure, img
  // Alles andere muss raus oder konvertiert werden.
  return html
    // LinkedIn Tags entfernen
    .replace(/<strong>?\s*<em>\s*<span[^>]*>#LI-DNI<\/span>\s*<\/em>\s*<\/strong>?\s*/g, "")
    .replace(/#LI-DNI/g, "")
    // Inline-Styles entfernen
    .replace(/\s*style="[^"]*"/g, "")
    // <span> Tags entfernen (Inhalt behalten)
    .replace(/<\/?span[^>]*>/g, "")
    // <div> → <p>
    .replace(/<div[^>]*>/g, "<p>")
    .replace(/<\/div>/g, "</p>")
    // <br><br> → Absatzwechsel
    .replace(/<br\s*\/?>\s*<br\s*\/?>/g, "</p><p>")
    // Einzelne <br> behalten (Webflow kann das)
    // Leere Tags entfernen
    .replace(/<(p|li|ul|ol|strong|em)>\s*<\/\1>/g, "")
    // Verschachtelte <strong>/<em> aufräumen
    .replace(/<strong>\s*<strong>/g, "<strong>")
    .replace(/<\/strong>\s*<\/strong>/g, "</strong>")
    .replace(/<em>\s*<em>/g, "<em>")
    .replace(/<\/em>\s*<\/em>/g, "</em>")
    // Mehrfache Leerzeilen/Whitespace komprimieren
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildRichTextDescription(jobDescriptions) {
  // Baut aus den einzelnen jobDescription-Bloecken ein zusammenhaengendes
  // RichText-HTML fuer Webflow
  const raw = jobDescriptions
    .map((desc) => `<h3>${desc.name}</h3>\n${desc.value}`)
    .join("\n");
  return cleanHtmlForWebflow(raw);
}

function buildAllLocations(office, additionalOffices) {
  const all = [office, ...additionalOffices].filter(Boolean);
  return [...new Set(all)].join(", ");
}

function formatSalary(salary) {
  if (!salary) return "";
  const typeLabel = salary.type === "monthly" ? "brutto/Monat" : "brutto/Jahr";
  if (salary.min && salary.max) {
    return `ab ${salary.currency} ${salary.min.toLocaleString("de-AT")} bis ${salary.currency} ${salary.max.toLocaleString("de-AT")} ${typeLabel}`;
  }
  if (salary.min) {
    return `ab ${salary.currency} ${salary.min.toLocaleString("de-AT")} ${typeLabel}`;
  }
  return "";
}

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

function personioJobToWebflowItem(job) {
  // Mapped ein Personio-Job auf Webflow CMS fieldData.
  // Die Feld-Slugs muessen mit der Webflow Collection uebereinstimmen.
  // Anpassen wenn die Collection andere Slugs hat!
  const location = job.office ? ` in ${job.office}` : "";
  return {
    name: job.name,
    slug: toSlug(`${job.name}-${job.personioId}`),
    "meta-seo-title": `${job.name}${location} | PÜSPÖK Karriere`,
    "meta-seo-description": `Jetzt bewerben: ${job.name}${location}. Werde Teil von PÜSPÖK, Österreichs größtem privaten Erzeuger erneuerbarer Energie.`,
    "personio-id": job.personioId,
    standort: job.office,
    "alle-standorte": buildAllLocations(job.office, job.additionalOffices),
    abteilung: job.department,
    kategorie: job.recruitingCategory,
    body: buildRichTextDescription(job.jobDescriptions),
    anstellungsart:
      LABELS.employmentType[job.employmentType] || job.employmentType,
    seniority: LABELS.seniority[job.seniority] || job.seniority,
    arbeitszeit: LABELS.schedule[job.schedule] || job.schedule,
    erfahrung: job.yearsOfExperience,
    gehalt: formatSalary(job.salary),
    "bewerbungslink": `${PERSONIO_BASE_URL}/${job.personioId}`,
    "erstellt-am": job.createdAt || undefined,
  };
}

// --------------- Webflow CMS API ---------------

async function webflowRequest(env, method, path, body) {
  const url = `https://api.webflow.com/v2${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${env.WEBFLOW_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Webflow API ${method} ${path}: ${res.status} – ${errorText}`);
  }
  return res.json();
}

async function getAllCmsItems(env) {
  // Alle Items aus der Collection laden (paginiert)
  const items = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await webflowRequest(
      env,
      "GET",
      `/collections/${env.WEBFLOW_COLLECTION_ID}/items?limit=${limit}&offset=${offset}`
    );
    items.push(...(data.items || []));
    if (!data.items || data.items.length < limit) break;
    offset += limit;
  }
  return items;
}

async function createItem(env, fieldData) {
  return webflowRequest(
    env,
    "POST",
    `/collections/${env.WEBFLOW_COLLECTION_ID}/items`,
    { fieldData, isArchived: false, isDraft: false }
  );
}

async function updateItem(env, itemId, fieldData) {
  return webflowRequest(
    env,
    "PATCH",
    `/collections/${env.WEBFLOW_COLLECTION_ID}/items/${itemId}`,
    { fieldData, isArchived: false, isDraft: false }
  );
}

async function deleteItem(env, itemId) {
  return webflowRequest(
    env,
    "DELETE",
    `/collections/${env.WEBFLOW_COLLECTION_ID}/items/${itemId}`
  );
}

async function publishItems(env, itemIds) {
  if (itemIds.length === 0) return;
  // Webflow erlaubt max 100 Items pro Publish-Call
  for (let i = 0; i < itemIds.length; i += 100) {
    const batch = itemIds.slice(i, i + 100);
    await webflowRequest(
      env,
      "POST",
      `/collections/${env.WEBFLOW_COLLECTION_ID}/items/publish`,
      { itemIds: batch }
    );
  }
}

// --------------- Sync Logic ---------------

async function syncJobs(env) {
  const log = [];

  // 1. Personio XML laden
  log.push("Fetching Personio XML...");
  const xmlUrl = env.PERSONIO_XML_URL || "https://puespoek.jobs.personio.com/xml";
  const xmlResponse = await fetch(xmlUrl);
  if (!xmlResponse.ok) {
    throw new Error(`Personio XML fetch failed: ${xmlResponse.status}`);
  }
  const xmlText = await xmlResponse.text();

  // 2. XML parsen
  const personioJobs = parseXML(xmlText);
  log.push(`Parsed ${personioJobs.length} jobs from Personio`);

  // 3. Bestehende Webflow Items laden
  const existingItems = await getAllCmsItems(env);
  log.push(`Found ${existingItems.length} existing items in Webflow`);

  // Index: Personio-ID → Webflow Item
  const existingByPersonioId = {};
  for (const item of existingItems) {
    const pid = item.fieldData?.["personio-id"];
    if (pid) {
      existingByPersonioId[pid] = item;
    }
  }

  // Index: Personio-IDs im aktuellen Feed
  const currentPersonioIds = new Set(personioJobs.map((j) => j.personioId));

  const created = [];
  const updated = [];
  const deleted = [];

  // 4. Neue und geaenderte Jobs
  for (const job of personioJobs) {
    const fieldData = personioJobToWebflowItem(job);
    const existing = existingByPersonioId[job.personioId];

    if (!existing) {
      // Neuer Job → erstellen
      try {
        const result = await createItem(env, fieldData);
        created.push(result.id || job.personioId);
        log.push(`Created: ${job.name} (${job.personioId})`);
      } catch (err) {
        log.push(`ERROR creating ${job.name}: ${err.message}`);
      }
    } else {
      // Bestehender Job → aktualisieren
      try {
        const result = await updateItem(env, existing.id, fieldData);
        updated.push(existing.id);
        log.push(`Updated: ${job.name} (${job.personioId})`);
      } catch (err) {
        log.push(`ERROR updating ${job.name}: ${err.message}`);
      }
    }
  }

  // 5. Geloeschte Jobs (nicht mehr im Feed)
  for (const [pid, item] of Object.entries(existingByPersonioId)) {
    if (!currentPersonioIds.has(pid)) {
      try {
        await deleteItem(env, item.id);
        deleted.push(item.id);
        log.push(`Deleted: ${item.fieldData?.name || pid}`);
      } catch (err) {
        log.push(`ERROR deleting ${pid}: ${err.message}`);
      }
    }
  }

  // 6. Alle geaenderten Items publishen
  const toPublish = [...created, ...updated];
  if (toPublish.length > 0) {
    try {
      await publishItems(env, toPublish);
      log.push(`Published ${toPublish.length} items`);
    } catch (err) {
      log.push(`ERROR publishing: ${err.message}`);
    }
  }

  const summary = {
    total: personioJobs.length,
    created: created.length,
    updated: updated.length,
    deleted: deleted.length,
    log,
  };

  return summary;
}

// --------------- Worker Entry Points ---------------

export default {
  // Cron Trigger (scheduled sync)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncJobs(env).then((result) => {
        console.log("Sync completed:", JSON.stringify(result));
      })
    );
  },

  // HTTP Handler (manual sync + status)
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /sync → manuellen Sync auslösen
    if (url.pathname === "/sync" && request.method === "POST") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // GET /preview → Personio-Daten als JSON anzeigen (ohne Webflow-Push)
    if (url.pathname === "/preview") {
      try {
        const xmlUrl = env.PERSONIO_XML_URL || "https://puespoek.jobs.personio.com/xml";
        const xmlResponse = await fetch(xmlUrl);
        const xmlText = await xmlResponse.text();
        const jobs = parseXML(xmlText);
        const mapped = jobs.map(personioJobToWebflowItem);
        return new Response(JSON.stringify(mapped, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // GET / → Status
    return new Response(
      JSON.stringify({
        service: "Personio → Webflow Job Sync",
        endpoints: {
          "POST /sync": "Manuellen Sync ausfuehren",
          "GET /preview": "Personio-Daten als JSON ansehen (kein Push)",
        },
        cron: "Alle 6 Stunden automatisch",
      }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
