# Bewerbungsformular – Setup & Dokumentation

## Übersicht

Eigenes Bewerbungsformular auf der Webflow-Seite, das Bewerbungen direkt an Personio schickt. Kein iFrame, kein Redirect – alles auf der PÜSPÖK-Seite.

```
Webflow Formular            Cloudflare Worker            Personio API
(HTML Embed)                POST /apply                  Recruiting API

  Bewerber füllt aus             │                            │
  → Name, Email, CV              │                            │
  → Klickt "Bewerben"            │                            │
       │                         │                            │
       │   FormData senden       │                            │
       │────────────────────────►│                            │
       │                         │   1. Dateien hochladen     │
       │                         │───────────────────────────►│
       │                         │   ◄── UUIDs zurück         │
       │                         │                            │
       │                         │   2. Bewerbung erstellen   │
       │                         │───────────────────────────►│
       │                         │   ◄── Erfolg/Fehler        │
       │   ◄── JSON Response     │                            │
       │                         │                            │
  Erfolgsmeldung anzeigen        │                            │
```

---

## Formular-Felder

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

### Dropdown-Optionen: Recruiting-Kanal

Karriere.at, stepstone, LinkedIn, PÜSPÖK Homepage, PÜSPÖK Mitarbeiter\*in, IG Windkraft, PV Austria, TU Career Center, Facebook, Print, Newsletter, Sonstige Jobbörse, Sonstiges

### Bedingte Felder

- **"Sonstige Jobbörse"** → Textfeld "Über wen / welche Plattform?"
- **"PÜSPÖK Mitarbeiter\*in"** → Textfeld "Über wen?"

### File Upload

- Max. 20 MB gesamt
- Formate: PDF, DOC, DOCX, ODT, RTF, JPG, PNG, ZIP, 7Z, RAR

---

## Einrichtung in Webflow

1. Job-Detailseite im Webflow Designer öffnen
2. Bestehendes Formular entfernen oder daneben ein **Embed-Element** einfügen
3. HTML aus `bewerbungsformular.html` reinkopieren
4. Den Platzhalter `PERSONIO_ID_FELD` im Hidden Input ersetzen:
   - Cursor in `value="PERSONIO_ID_FELD"` setzen, Text löschen
   - Oben rechts **"Add Field"** klicken → **Personio ID** auswählen
5. Publishen

### Styling

Das Formular nutzt bestehende Webflow-Klassen:

| Element | Klassen |
|---------|---------|
| Form | `form-wrapper` |
| Input | `input-field w-input` |
| Select | `input-field is-select w-select` |
| Input-Wrapper | `input-wrap` |
| 2-spaltig | `input-double` |
| Toggle | `checkbox-toggle-field`, `checkbox-toggle` |
| Toggle-Text | `text-style-tiny w-form-label` |
| Bottom-Row | `form-spreader` |
| Button | `btn btn-animate-chars` + `btn-background` + `text-style-tagline` + `hidden-submit` |

Eigenes CSS nur für: File-Uploads (`.pf-file`), bedingte Felder (`.pf-conditional`), Validierung (`.pf-invalid`), Loading-State, Meldungen.

---

## Secrets setzen

Sobald der Personio Recruiting API Token vorliegt:

```bash
cd personio-sync
npx wrangler secret put PERSONIO_RECRUITING_TOKEN
npx wrangler secret put PERSONIO_COMPANY_ID
```

### Wo bekommt man Token & Company ID?

Personio → Einstellungen → Integrationen → API-Zugriffsdaten

- **Recruiting API Schlüssel** → kopieren
- **Unternehmens-ID** → kopieren

Braucht Admin-Rechte oder Berechtigung für "Marketplace & Integrationen".

Der Token läuft **nicht ab** (statisch, bis manuell zurückgesetzt).

---

## Testen

### 1. Worker-Endpoint prüfen

```bash
# Sollte den /apply Endpoint listen
curl https://personio-webflow-sync.achtzehngrad.workers.dev
```

### 2. Testbewerbung senden

Auf der Webflow-Seite eine Bewerbung mit Testdaten absenden. Prüfen:

- Erscheint die Erfolgsmeldung?
- Taucht die Bewerbung in Personio auf? (Recruiting → Bewerbungen)
- Sind die Dateien (CV etc.) korrekt angehängt?
- Ist der Recruiting-Kanal als Nachricht sichtbar?

### 3. Fehlerszenarien

- Pflichtfelder leer → Rote Border + Fehlermeldung (kein Browser-Alert)
- Dateien > 20 MB → Fehlermeldung
- Secrets nicht gesetzt → Worker gibt 500 zurück, Formular zeigt Fehlermeldung

---

## Dateien

```
webflow-embed-snippets/
├── bewerbungsformular.html     # Formular HTML + CSS + JS (→ Webflow Embed)
├── bewerbungsformular-spec.md  # Detaillierte Feld-Spezifikation + API-Doku
├── email-angelika-api-token.md # E-Mail-Vorlage für Token-Anfrage
├── FORMULAR-SETUP.md           # Diese Datei
└── personio-iframe.html        # (veraltet, nicht verwenden)
```

Worker-Code: `personio-sync/src/worker.js` → Funktionen `handleApplication()`, `uploadDocumentToPersonio()`, `createPersonioApplication()`
