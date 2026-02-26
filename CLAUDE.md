# Claude Code Configuration

## Project: Personio → Webflow Job Sync (Puespoek)

This project syncs open job positions from Puespoek's Personio account
into a Webflow CMS Collection via a Cloudflare Worker.

## Key Files

- `personio-sync/src/worker.js` - Main sync script (Cloudflare Worker)
- `personio-sync/wrangler.toml` - Worker config, cron schedule, environment vars
- `HANDOVER-DORIAN.md` - Setup instructions for IT

## Architecture

- **Source:** Personio XML feed at `https://puespoek.jobs.personio.com/xml`
- **Target:** Webflow CMS Collection "Jobs"
- **Runtime:** Cloudflare Worker (Free Plan)
- **Schedule:** Cron every 6 hours
- **Sync key:** `personio-id` field links Personio positions to Webflow CMS items

## Important Conventions

- All user-facing labels are in German (Festanstellung, Vollzeit, etc.)
- The field mapping in `personioJobToWebflowItem()` must match Webflow CMS field slugs exactly
- Secrets (WEBFLOW_API_TOKEN, WEBFLOW_COLLECTION_ID) are set via `wrangler secret put`
- The XML parser is custom (no DOM in Workers) - if Personio changes their XML structure, update `parseXML()`

## Webflow Site

- The Puespoek Webflow site is not yet developed
- The Webflow account is under the digitalwerk-agency workspace
- When the site is ready: create the CMS Collection, set secrets, deploy

## Client

- Company: Puespoek (largest private renewable energy producer in Austria)
- Contact: Angelika (client-side)
- IT: Dorian (digitalwerk, setup & deployment)
