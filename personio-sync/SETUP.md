# Personio → Webflow Job Sync

Cloudflare Worker der alle 6 Stunden die offenen Stellen von Personio XML
in die Webflow CMS Job-Collection synchronisiert.

## Voraussetzungen

- Node.js >= 18
- Cloudflare Account (kostenloser Free-Plan reicht)
- Webflow API Token (Site-spezifisch)

## 1. Webflow CMS Collection anlegen

In der Webflow-Site eine neue CMS Collection **"Jobs"** erstellen mit diesen Feldern:

| Feld-Name | Slug (in Webflow) | Typ | Pflicht |
|---|---|---|---|
| Name | `name` | Plain Text | Ja |
| Personio ID | `personio-id` | Plain Text | Ja |
| Standort | `standort` | Plain Text | Nein |
| Alle Standorte | `alle-standorte` | Plain Text | Nein |
| Abteilung | `abteilung` | Plain Text | Nein |
| Kategorie | `kategorie` | Plain Text | Nein |
| Beschreibung | `beschreibung` | Rich Text | Nein |
| Anstellungsart | `anstellungsart` | Plain Text | Nein |
| Seniority | `seniority` | Plain Text | Nein |
| Arbeitszeit | `arbeitszeit` | Plain Text | Nein |
| Erfahrung | `erfahrung` | Plain Text | Nein |
| Gehalt | `gehalt` | Plain Text | Nein |
| Bewerbungslink | `bewerbungslink` | Link | Nein |
| Erstellt am | `erstellt-am` | Date/Time | Nein |

> Die Feld-Slugs im Worker muessen exakt mit den CMS-Feld-Slugs in Webflow
> uebereinstimmen. Falls Webflow andere Slugs vergibt, in `worker.js`
> Funktion `personioJobToWebflowItem()` anpassen.

## 2. Webflow API Token erstellen

1. Webflow Dashboard → Site Settings → Apps & Integrations → API Access
2. API Token generieren mit Berechtigungen: **CMS Read/Write**
3. Die **Collection ID** findest du unter: Site Settings → CMS → Collection auswaehlen → URL enthaelt die ID

## 3. Worker deployen

```bash
cd personio-sync
npm install

# Secrets setzen
npx wrangler secret put WEBFLOW_API_TOKEN
# → Token aus Schritt 2 eingeben

npx wrangler secret put WEBFLOW_COLLECTION_ID
# → Collection ID eingeben

# Deployen
npm run deploy
```

## 4. Testen

```bash
# Lokal starten
npm run dev

# Vorschau der Personio-Daten (ohne Webflow-Push)
curl http://localhost:8787/preview

# Manueller Sync ausloesen
curl -X POST http://localhost:8787/sync
```

## 5. Endpoints

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/` | GET | Status & Info |
| `/preview` | GET | Personio-Daten als JSON (kein Push) |
| `/sync` | POST | Manuellen Sync ausloesen |

Der Cron-Trigger laeuft automatisch alle 6 Stunden.

## Feld-Mapping Personio → Webflow

- `employmentType`: permanent → Festanstellung, intern → Praktikum, trainee → Trainee, freelance → Freelance
- `seniority`: entry-level → Berufseinsteiger, experienced → Berufserfahren, executive → Fuehrungskraft, student → Student/Praktikant
- `schedule`: full-time → Vollzeit, part-time → Teilzeit, full-or-part-time → Voll- oder Teilzeit
- Bewerbungslink: `https://puespoek.jobs.personio.com/job/{id}`
- Alle `jobDescription`-Bloecke werden zu einem RichText zusammengefuegt (mit H3-Ueberschriften)

## Sync-Logik

1. XML von Personio laden
2. Bestehende Webflow CMS Items laden
3. Vergleich ueber `personio-id`:
   - Neue Jobs → CMS Item erstellen
   - Bestehende Jobs → CMS Item aktualisieren
   - Entfernte Jobs (nicht mehr im Feed) → CMS Item loeschen
4. Alle geaenderten Items publishen

## Cron anpassen

In `wrangler.toml` den Cron-Ausdruck aendern:

```toml
[triggers]
crons = ["0 */6 * * *"]  # alle 6 Stunden
# crons = ["0 8 * * *"]  # taeglich um 8:00 UTC
# crons = ["*/30 * * * *"]  # alle 30 Minuten
```
