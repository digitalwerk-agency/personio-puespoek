# Claude Code Configuration

## Project: Personio → Webflow Job Sync (PÜSPÖK)

This project syncs open job positions from PÜSPÖK's Personio account
into a Webflow CMS Collection via a Cloudflare Worker.

## Status: LIVE

- **Worker:** `https://personio-webflow-sync.puespoek.workers.dev`
- **Cloudflare Account:** puespoek.workers.dev
- **Deployment:** Auto-deploy via Cloudflare Git integration (push to main)

## Key Files

- `personio-sync/src/worker.js` - Main sync script (Cloudflare Worker)
- `personio-sync/wrangler.toml` - Worker config, cron schedule, environment vars
- `HANDOVER-DORIAN.md` - Full documentation & deployment guide

## Architecture

- **Source:** Personio XML feed at `https://puespoek.jobs.personio.com/xml`
- **Target:** Webflow CMS Collection "Jobs" (ID: `69c396e5be115a97f09524f8`, Slug: `offene-stellen`)
- **Runtime:** Cloudflare Worker (Free Plan)
- **Schedule:** Cron every 6 hours
- **Sync key:** `personio-id` field links Personio positions to Webflow CMS items
- **Deploy:** Auto via Cloudflare Git integration on push to main

## Important Conventions

- All user-facing labels are in German (Festanstellung, Vollzeit, etc.)
- The field mapping in `personioJobToWebflowItem()` must match Webflow CMS field slugs exactly
- The description maps to the `body` RichText field (not `beschreibung`)
- SEO fields (meta-seo-title, meta-seo-description) are auto-generated from job title + location
- LinkedIn #LI-DNI tags are stripped from job descriptions
- Secrets (WEBFLOW_API_TOKEN, WEBFLOW_COLLECTION_ID) are set via `wrangler secret put`
- The XML parser is custom (no DOM in Workers) - if Personio changes their XML structure, update `parseXML()`
- Fields NOT in the worker mapping (image, tags, order, related-jobs) are safe to edit manually in Webflow

## Webflow Site

- The PÜSPÖK Webflow site is live under the digitalwerk-agency workspace
- CMS Collection "Jobs" is set up with all required fields

## Client

- Company: PÜSPÖK (largest private renewable energy producer in Austria)
- Contact: Angelika (client-side)
- IT: Dorian (digitalwerk, setup & deployment)
