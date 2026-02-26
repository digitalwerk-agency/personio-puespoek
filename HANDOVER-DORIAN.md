# Personio Job-Sync fuer Puespoek Webflow-Site

Hi Dorian,

hier ist das fertige Sync-Script, das die offenen Stellen von Puespoek aus dem
Personio XML-Feed automatisch in die Webflow CMS Job-Collection synchronisiert.

## Wie es funktioniert

Ein **Cloudflare Worker** (kostenlos im Free-Plan) laueft alle 6 Stunden und:

1. Holt das XML von `https://puespoek.jobs.personio.com/xml`
2. Parst alle offenen Stellen
3. Vergleicht mit den bestehenden Webflow CMS Items (ueber die Personio-ID)
4. Erstellt neue Jobs, aktualisiert geaenderte, loescht entfernte
5. Published alle Aenderungen automatisch

## Was du brauchst

- **Node.js** >= 18
- **Cloudflare Account** (Free-Plan reicht)
- **Webflow API Token** mit CMS Read/Write Berechtigung

## Setup in 5 Schritten

### 1. CMS Collection in Webflow anlegen

Erstelle eine neue Collection **"Jobs"** (Singular: "Job", Slug: `jobs`) mit diesen Feldern:

| Feld-Name | Typ | Anmerkung |
|---|---|---|
| Name | Plain Text | Pflichtfeld, Stellentitel |
| Personio ID | Plain Text | Pflichtfeld, zum Sync-Abgleich |
| Standort | Plain Text | Hauptstandort (z.B. "Parndorf") |
| Alle Standorte | Plain Text | Komma-getrennt (z.B. "Parndorf, Remote, Wien") |
| Abteilung | Plain Text | z.B. "Projektentwicklung" |
| Kategorie | Plain Text | Recruiting-Kategorie |
| Beschreibung | Rich Text | Alle Job-Descriptions zusammengefuegt |
| Anstellungsart | Plain Text | Deutsch: Festanstellung / Praktikum / Trainee / Freelance |
| Seniority | Plain Text | Deutsch: Berufserfahren / Berufseinsteiger / etc. |
| Arbeitszeit | Plain Text | Deutsch: Vollzeit / Teilzeit / Voll- oder Teilzeit |
| Erfahrung | Plain Text | z.B. "2-5" (Jahre) |
| Gehalt | Plain Text | z.B. "ab EUR 4.500 brutto/Monat" |
| Bewerbungslink | Link | Automatisch: `https://puespoek.jobs.personio.com/job/{id}` |
| Erstellt am | Date/Time | Erstellungsdatum der Stelle |

**Wichtig:** Die Feld-Slugs in Webflow muessen mit dem Script uebereinstimmen.
Webflow generiert Slugs automatisch aus dem Feld-Namen. Falls sie abweichen,
in `src/worker.js` → Funktion `personioJobToWebflowItem()` anpassen.

### 2. Webflow API Token holen

1. Webflow Dashboard → Site Settings → Apps & Integrations → API Access
2. Token generieren mit **CMS Read/Write** Berechtigungen
3. Collection ID findest du in der URL wenn du die Collection im Dashboard oeffnest

### 3. Worker deployen

```bash
cd personio-sync
npm install

# Secrets setzen (interaktive Eingabe)
npx wrangler secret put WEBFLOW_API_TOKEN
npx wrangler secret put WEBFLOW_COLLECTION_ID

# Deployen
npm run deploy
```

### 4. Testen

```bash
# Lokal starten
npm run dev

# Vorschau: zeigt die Personio-Daten als JSON (ohne Webflow-Push)
curl http://localhost:8787/preview

# Manuellen Sync ausloesen
curl -X POST http://localhost:8787/sync
```

### 5. Fertig

Der Worker laeuft ab jetzt automatisch alle 6 Stunden.
Du kannst den Cron in `wrangler.toml` anpassen:

```toml
[triggers]
crons = ["0 */6 * * *"]   # alle 6 Stunden (Standard)
# crons = ["0 8 * * *"]   # taeglich um 8:00 UTC
# crons = ["*/30 * * * *"] # alle 30 Minuten
```

## Endpoints nach dem Deploy

| Endpoint | Methode | Was es tut |
|---|---|---|
| `/` | GET | Status & Info anzeigen |
| `/preview` | GET | Personio-Daten als JSON ansehen (kein Webflow-Push) |
| `/sync` | POST | Manuellen Sync ausloesen |

## Wie der Sync arbeitet

```
Personio XML                    Webflow CMS
┌──────────────┐               ┌──────────────┐
│ Position 1   │──── neu? ────▶│ Item erstellen│
│ Position 2   │── gleich? ──▶│ Item updaten  │
│ Position 3   │               │ Item 4 weg?  │──▶ loeschen
└──────────────┘               └──────────────┘
                                      │
                                      ▼
                               Auto-Publish
```

- Abgleich ueber das Feld `personio-id`
- Neue Stellen werden erstellt
- Bestehende werden aktualisiert (Titel, Beschreibung, Standort, etc.)
- Stellen die nicht mehr im Feed sind werden aus dem CMS entfernt

## Deutsches Label-Mapping

Die englischen Personio-Werte werden automatisch uebersetzt:

| Personio | Webflow |
|---|---|
| permanent | Festanstellung |
| intern | Praktikum |
| trainee | Trainee |
| freelance | Freelance |
| full-time | Vollzeit |
| part-time | Teilzeit |
| full-or-part-time | Voll- oder Teilzeit |
| entry-level | Berufseinsteiger |
| experienced | Berufserfahren |
| executive | Fuehrungskraft |
| student | Student/Praktikant |

## Bei Fragen

Das Script liegt in `personio-sync/src/worker.js` und ist ausfuehrlich kommentiert.
Die zentrale Stelle zum Anpassen ist die Funktion `personioJobToWebflowItem()` –
dort wird jedes Personio-Feld auf ein Webflow-CMS-Feld gemappt.
