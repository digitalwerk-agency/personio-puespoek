# Personio → Webflow Job-Sync | PÜSPÖK

## Status: LIVE

Der Sync ist deployed und läuft automatisch alle 6 Stunden.

- **Worker URL:** `https://personio-webflow-sync.achtzehngrad.workers.dev`
- **Cloudflare Account:** Raphael, office@achtzehngrad.at (achtzehngrad.workers.dev)
- **Webflow Site:** PÜSPÖK (migriert, Staging: `https://puespoek-staging.webflow.io`)
- **Collection:** Jobs (ID: `69e8c53f49395a3e534bf834`, Slug: `offene-stellen`)

---

## Wie es funktioniert

```
Personio XML Feed          Cloudflare Worker           Webflow CMS
(alle offenen Stellen)     (alle 6h via Cron)          (Collection "Jobs")

puespoek.jobs.personio     personio-webflow-sync       CMS Items mit
  .com/xml                   .achtzehngrad.workers.dev       personio-id
       │                            │                         │
       │   1. XML abrufen           │                         │
       │◄───────────────────────────│                         │
       │                            │                         │
       │   2. Jobs parsen &         │   3. Vergleich via      │
       │      transformieren        │      personio-id        │
       │                            │◄────────────────────────│
       │                            │                         │
       │                            │   4. Create/Update/     │
       │                            │      Delete + Publish   │
       │                            │────────────────────────►│
```

### Sync-Logik

1. **XML abrufen** von `https://puespoek.jobs.personio.com/xml`
2. **Parsen** aller offenen Stellen aus dem XML
3. **Vergleich** mit bestehenden Webflow CMS Items über das Feld `personio-id`
4. **Neue Stellen** → CMS Item erstellen
5. **Geänderte Stellen** → CMS Item aktualisieren
6. **Entfernte Stellen** (nicht mehr im Feed) → CMS Item löschen
7. **Auto-Publish** aller Änderungen

---

## Feldmapping: Personio → Webflow

### Automatisch vom Worker befüllt (werden alle 6h aktualisiert)

| Webflow Feld-Slug | Typ | Quelle |
|---|---|---|
| `name` | PlainText | Stellentitel aus Personio |
| `slug` | PlainText | Auto-generiert: `{titel}-{personio-id}` |
| `meta-seo-title` | PlainText | Auto: `{Titel} in {Standort} \| PÜSPÖK Karriere` |
| `meta-seo-description` | PlainText | Auto: `Jetzt bewerben: {Titel} in {Standort}...` |
| `personio-id` | PlainText | Personio Job-ID (Sync-Key, nicht ändern!) |
| `standort` | PlainText | Haupt-Standort |
| `alle-standorte` | PlainText | Alle Standorte kommasepariert |
| `abteilung` | PlainText | Department |
| `kategorie` | PlainText | Recruiting-Kategorie |
| `body` | RichText | Job-Beschreibung (Dein Job / Dein Profil / Dein Vorteil) |
| `anstellungsart` | PlainText | Festanstellung, Befristet, Praktikum, Trainee, Freelance |
| `seniority` | PlainText | Berufseinsteiger, Berufserfahren, Führungskraft, Student/Praktikant |
| `arbeitszeit` | PlainText | Vollzeit, Teilzeit, Voll- oder Teilzeit |
| `erfahrung` | PlainText | Jahre Berufserfahrung |
| `gehalt` | PlainText | z.B. "ab EUR 4.500 brutto/Monat" |
| `bewerbungslink` | Link | `https://puespoek.jobs.personio.com/job/{id}` |
| `erstellt-am` | DateTime | Erstellungsdatum in Personio |

### Manuell in Webflow pflegbar (werden NICHT überschrieben)

| Webflow Feld-Slug | Typ | Verwendung |
|---|---|---|
| `image` | Image | Bild für die Stellenanzeige |
| `image-alt-text` | PlainText | Alt-Text für das Bild |
| `tags` | MultiReference | Job Tags (m/W/D, Remote, Standorte etc.) |
| `order` | Number | Sortierreihenfolge |
| `related-jobs` | MultiReference | Verwandte Stellen |

---

## Deutsches Label-Mapping

Englische Personio-Werte werden automatisch übersetzt:

| Personio | Webflow |
|---|---|
| permanent | Festanstellung |
| temporary | Befristet |
| intern | Praktikum |
| trainee | Trainee |
| freelance | Freelance |
| full-time | Vollzeit |
| part-time | Teilzeit |
| full-or-part-time | Voll- oder Teilzeit |
| entry-level | Berufseinsteiger |
| experienced | Berufserfahren |
| executive | Führungskraft |
| student | Student/Praktikant |

---

## Endpoints

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/` | GET | Status & Info |
| `/preview` | GET | Personio-Daten als JSON ansehen (kein Push) |
| `/sync` | POST | Manuellen Sync auslösen |

### Manueller Sync

```bash
curl -X POST https://personio-webflow-sync.achtzehngrad.workers.dev/sync
```

---

## Automatischer Cron

Der Worker läuft alle 6 Stunden automatisch (0:00, 6:00, 12:00, 18:00 UTC).

Cron-Schedule ändern in `wrangler.toml`:

```toml
[triggers]
crons = ["0 */6 * * *"]    # alle 6 Stunden (aktuell)
# crons = ["0 8 * * *"]    # täglich um 8:00 UTC
# crons = ["*/30 * * * *"] # alle 30 Minuten
```

Nach Änderung: `npx wrangler deploy`

---

## Technischer Stack

| Komponente | Details |
|---|---|
| **Runtime** | Cloudflare Workers (Free Plan) |
| **Source** | `personio-sync/src/worker.js` |
| **Config** | `personio-sync/wrangler.toml` |
| **Personio Feed** | `https://puespoek.jobs.personio.com/xml` |
| **Webflow API** | v2, CMS Collection Items |
| **Secrets** | `WEBFLOW_API_TOKEN`, `WEBFLOW_COLLECTION_ID` |

---

## Secrets & Zugänge

Secrets sind in Cloudflare Workers gesetzt (nicht im Code):

```bash
# Secrets anzeigen (nur Namen, nicht Werte)
npx wrangler secret list

# Secret neu setzen
npx wrangler secret put WEBFLOW_API_TOKEN
npx wrangler secret put WEBFLOW_COLLECTION_ID
```

Collection ID: `69e8c53f49395a3e534bf834`

Webflow API Token: In Webflow → Workspace Settings → Integrations → API Access generieren (CMS Read/Write Rechte).

---

## Sonderfälle & Bereinigungen

- **#LI-DNI Tags:** LinkedIn "Do Not Index" Tags aus Personio werden automatisch aus dem Body-Text entfernt
- **HTML-Entities:** `&amp;` etc. kommen direkt aus Personio und werden von Webflow korrekt gerendert
- **Leere Felder:** Wenn Personio kein Gehalt/Erfahrung liefert, bleibt das Feld in Webflow leer

---

## Bewerbungsformular

Das Bewerbungsformular ist als **Custom HTML Embed** in der Webflow Job-Detailseite eingebaut. Es nutzt die bestehenden Webflow CSS-Klassen (`input-field`, `btn`, `checkbox-toggle`, etc.) und hat eigenes CSS nur für die File-Uploads.

### Wie es funktioniert

```
Webflow Formular          Cloudflare Worker          Personio Recruiting API
(HTML Embed)              POST /apply                POST /applications

  Bewerber füllt aus          │                           │
  → Name, Email, CV           │                           │
  → Klickt "Bewerben"         │                           │
       │                      │                           │
       │   FormData senden    │                           │
       │─────────────────────►│                           │
       │                      │   1. Dateien hochladen    │
       │                      │──────────────────────────►│
       │                      │   ◄── UUIDs zurück        │
       │                      │                           │
       │                      │   2. Bewerbung erstellen  │
       │                      │──────────────────────────►│
       │                      │   ◄── Erfolg/Fehler       │
       │   ◄── JSON Response  │                           │
       │                      │                           │
  Erfolgsmeldung anzeigen     │                           │
```

### Formular-Felder

| Feld | Typ | Pflicht |
|------|-----|---------|
| Vorname | Text | Ja |
| Nachname | Text | Ja |
| E-Mail | Email | Ja |
| Telefon | Tel | Nein |
| Lebenslauf / CV | File Upload | Ja |
| Anschreiben | File Upload | Nein |
| Weitere Unterlagen | File Upload (mehrere) | Nein |
| Recruiting-Kanal | Dropdown (13 Optionen) | Ja |
| Datenschutz-Toggle | Checkbox | Ja |

### Einrichtung in Webflow

1. Job-Detailseite im Designer öffnen
2. **Embed-Element** einfügen wo das Formular hin soll
3. HTML aus `webflow-embed-snippets/bewerbungsformular.html` reinkopieren
4. Den Platzhalter `PERSONIO_ID_FELD` im Hidden Input über **"Add Field" → Personio ID** ersetzen

### Secrets für den /apply Endpoint

```bash
npx wrangler secret put PERSONIO_RECRUITING_TOKEN
npx wrangler secret put PERSONIO_COMPANY_ID
```

Token & Company ID: Personio → Einstellungen → Integrationen → API-Zugriffsdaten → Recruiting API

### Dateien

- `webflow-embed-snippets/bewerbungsformular.html` – Formular HTML + CSS + JS
- `webflow-embed-snippets/bewerbungsformular-spec.md` – Feld-Spezifikation
- `webflow-embed-snippets/email-angelika-api-token.md` – E-Mail-Vorlage für API-Token-Anfrage

---

## Deployment

Der Worker wird **automatisch deployed** bei jedem Push auf `main` via Cloudflare Git Integration.

```bash
# Code ändern, committen, pushen → Auto-Deploy
git add . && git commit -m "Beschreibung" && git push

# Manuelles Deploy (nur falls nötig)
cd personio-sync
npx wrangler login
npx wrangler deploy
```

---

## Projektdateien

```
personio-puespoek/
├── personio-sync/
│   ├── src/
│   │   └── worker.js              # Worker: Sync + Bewerbungs-Endpoint
│   ├── wrangler.toml               # Worker-Config & Cron
│   └── package.json
├── webflow-embed-snippets/
│   ├── bewerbungsformular.html     # Formular HTML/CSS/JS für Webflow Embed
│   ├── bewerbungsformular-spec.md  # Feld-Spezifikation
│   └── email-angelika-api-token.md # E-Mail-Vorlage für Token-Anfrage
├── CLAUDE.md                       # Projekt-Kontext für Claude Code
└── HANDOVER-DORIAN.md              # Diese Datei
```
