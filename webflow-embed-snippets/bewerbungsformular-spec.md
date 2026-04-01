# Bewerbungsformular – Spezifikation

## Formular-Felder

| # | Feld | Label | Typ | Pflicht | Anmerkung |
|---|------|-------|-----|---------|-----------|
| 1 | `first_name` | Vorname | Text | Ja | |
| 2 | `last_name` | Nachname | Text | Ja | |
| 3 | `email` | E-Mail | Email | Ja | |
| 4 | `phone` | Telefon | Tel | Nein | Placeholder: "+43", Pattern: nur Nummern/Telefon-Zeichen |
| 5 | `gender` | Geschlecht | Dropdown | Nein | Männlich, Weiblich, Divers, Unbestimmt |
| 6 | `available_from` | Verfügbar ab | Date | Nein | |
| 7 | `salary_expectations` | Gehaltsvorstellung | Text | Nein | |
| 8 | `upload_cv` | Lebenslauf / CV | File Upload | Ja | Max 20MB, Formate: pdf, docx, doc, jpg, png, etc. |
| 9 | `upload_cover_letter` | Anschreiben | File Upload | Nein | |
| 10 | `upload_other` | Weitere Unterlagen | File Upload | Nein | Mehrere Dateien möglich |
| 11 | `referer` | Wie bist du auf die Job-Anzeige aufmerksam geworden? | Dropdown | Ja | Siehe Optionen unten |
| 12 | `referer_other` | Über wen / welche Plattform? | Text | Ja (bedingt) | Nur wenn referer = "Sonstige Jobbörse" |
| 13 | `referer_person` | Über wen? | Text | Ja (bedingt) | Nur wenn referer = "PÜSPÖK Mitarbeiter*in" |
| 14 | `privacy_policy` | Zustimmung zur Datenverarbeitung | Checkbox | Ja | Siehe DSGVO-Text unten |

## Dropdown: Recruiting-Kanal (referer)

1. Karriere.at
2. stepstone
3. LinkedIn
4. PÜSPÖK Homepage
5. PÜSPÖK Mitarbeiter*in
6. IG Windkraft
7. PV Austria
8. TU Career Center
9. Facebook
10. Print
11. Newsletter
12. Sonstige Jobbörse
13. Sonstiges

## Bedingte Felder

- **referer = "Sonstige Jobbörse"** → Zeige Feld `referer_other` (Placeholder: "Über wen / welche Plattform?")
- **referer = "PÜSPÖK Mitarbeiter*in"** → Zeige Feld `referer_person` (Placeholder: "Über wen?")

## DSGVO-Text (Checkbox)

> Ich nehme die [Datenschutzbestimmung](https://www.puespoek.at/datenschutz/) zur Kenntnis.

## File Upload

- **Max Gesamtgröße:** 20 MB
- **Akzeptierte Formate:** pdf, docx, doc, jpg, jpeg, png, txt, odt, ods, xlsx, rtf, xls, pptx, ppt, gif, tif, tiff, bmp, csv, rar, gz, zip, 7z, mp4, 3gp, mov, avi, wmv
- **Kategorien (API):** `cv`, `cover-letter`, `other`

## Personio Recruiting API

### 1. Dokumente hochladen

```
POST https://api.personio.de/v1/recruiting/applications/documents
Content-Type: multipart/form-data
Authorization: Bearer {RECRUITING_API_TOKEN}
```

Response: UUID pro Datei

### 2. Bewerbung erstellen

```
POST https://api.personio.de/v1/recruiting/applications
Content-Type: application/json
Authorization: Bearer {RECRUITING_API_TOKEN}
X-Company-ID: {COMPANY_ID}
```

```json
{
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "job_position_id": 2550197,
  "files": [{"uuid": "...", "original_filename": "cv.pdf", "category": "cv"}],
  "attributes": [
    {"id": "gender", "value": "male"},
    {"id": "phone", "value": "+43 660 1234567"},
    {"id": "available_from", "value": "2026-05-01"},
    {"id": "salary_expectations", "value": "4500 EUR brutto"}
  ]
}
```

### Auth

- **Recruiting API Token:** Personio → Settings → API → Credentials → Recruiting API Access Token
- **Company ID:** Personio → Settings → API → Credentials

### Rate Limit

100 Bewerbungen pro 60 Sekunden pro IP
