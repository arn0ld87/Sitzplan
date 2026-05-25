# Milestones – Sitzplaner

## Milestone 0 – Projektbasis und Planung

Ziel: Produkt- und Technikbasis dokumentieren.

Status: angelegt

Lieferumfang:

- `PLAN.md`
- Lastenheft
- Pflichtenheft
- Heuristikplan
- Backlog
- Architekturplan
- Security-/Privacy-Konzept
- QA-Testplan
- Release-Checkliste

Abnahme:

- alle Planungsdokumente liegen im Repo
- bestehender README-Inhalt bleibt erhalten
- keine produktiven Dateien werden unnötig verändert

## Milestone 1 – MVP-Härtung lokal

Status: **alle 7 Slices fertig** (Branch `feat/milestone-1`, Stand 2026-05-25 — bereit für PR).

Ziel: Die vorhandene lokale App wird stabil und testbar.

Pflichtaufgaben:

- [x] Storage-Format versionieren — `src/utils/storage.ts`, ADR 0002
- [x] Migration für bestehende `localStorage`-Daten einführen — Legacy v0 → v1 Envelope
- [x] Importvalidierung ergänzen — `src/utils/validation.ts` mit Pfad-basierten Fehlern
- [ ] Exportformat dokumentieren — derzeit `{ classes, layout }`; Ziel-Format aus PFLICHTENHEFT §3.1 noch offen
- [x] IDs auf `crypto.randomUUID()` für neue Daten umstellen — `src/utils/ids.ts`
- [x] Fehlermeldungen für Import/Storage verbessern — Banner mit ersten 5 Fehlern, kein silent overwrite
- [x] Schülerlöschung und Regelbereinigung — `handleDeleteStudent` cleant `studentId`/`targetId`-Refs
- [x] Solver-Unit-Tests einführen — Slice 6: Vitest + 49 Tests / Coverage 61.7 %
- [x] CI mit Build und Lint einrichten — `.github/workflows/ci.yml`

Slice-Tracking (Branch `feat/milestone-1`):

| Slice | Inhalt | Commit |
|---|---|---|
| 1 | Storage-Utility + Migration | `cfe3d47`, `7ad53ca` (skip-mount-fix) |
| 2 | Import-Validierung + Fehlerbanner | `7f2be45` |
| 3 | UUID-Umstellung | `1070c6c` |
| 4 | Schülerlöschung mit Regel-Cleanup | enthalten in Slice 1 |
| 5 | Solver: `valid`-Flag bei Hard-Violations | `d1c7332` |
| 6 | Vitest-Setup + Tests | `db91e21` (49 Tests, 61.7 % Coverage) |
| 7 | GitHub Actions CI | `7a61656` |

Abnahme:

- `pnpm lint` grün — **offen**: 9 pre-existing Errors (Generator/parser/solver), kein M1-Regress, Cleanup als Folgearbeit
- `pnpm build` grün — erfüllt
- Solver-Basistests grün — erfüllt (49 Tests in 6 Files, Slice 6)
- Import kaputter JSON-Dateien zerstört keine Daten — erfüllt (Slice 2)
- vorhandene Nutzerdaten werden migriert — erfüllt (Slice 1, v0 → v1)

## Milestone 2 – Solver-Qualität und Konfliktanalyse

Ziel: Vorschläge werden zuverlässiger und erklärbarer.

Pflichtaufgaben:

- harte Regelverletzungen als ungültig behandeln
- Konfliktanalyse bei unlösbaren Regeln
- Random-Restarts oder mehrere Kandidatenläufe
- Schwierigkeitsgewichtung pro Schüler:in
- bessere Scoring-Erklärungen
- Vorschläge deduplizieren
- Tests für Hard-/Soft-Regeln erweitern

Abnahme:

- gültige Vorschläge enthalten keine Hard-Violations
- bei unlösbaren Regeln erscheint eine konkrete Diagnose
- drei Vorschläge unterscheiden sich sinnvoll
- Laufzeit bleibt unter 2 Sekunden bei 35 Schüler:innen

## Milestone 3 – Raumeditor und Bedienbarkeit

Ziel: Raumlayouts werden komfortabler und weniger fehleranfällig.

Pflichtaufgaben:

- Mindestanzahl Sitzplätze sichtbar machen
- Warnung bei mehr Schüler:innen als Plätzen
- Elementkollisionen erkennen oder anzeigen
- Undo/Redo vorbereiten oder umsetzen
- Tastaturbedienung für zentrale Aktionen verbessern
- leere Zustände verbessern

Abnahme:

- Raumeditor ist ohne Vorwissen nutzbar
- keine stillen kaputten Layouts
- Druckansicht bleibt intakt

## Milestone 4 – Produktreife lokale Version

Ziel: Lokale App als ernsthaft nutzbares Werkzeug veröffentlichen.

Pflichtaufgaben:

- Projektdatei-Export mit `schemaVersion`
- mehrere Layouts pro Klasse
- Sitzplan-Versionen speichern
- PDF-Export prüfen oder Browser-Druck verbessern
- CSV-Import für Schülerlisten
- Release-Build dokumentieren
- manuelle Smoke-Test-Checkliste verwenden

Abnahme:

- Lehrkraft kann komplette Klasse importieren
- Plan generieren, speichern, drucken, exportieren
- Daten bleiben nach Browser-Neustart erhalten
- Backup/Restore funktioniert reproduzierbar

## Milestone 5 – Optionales Backend-Konzept

Ziel: Backend nicht blind bauen, sondern vorbereitet entscheiden.

Pflichtaufgaben:

- Backend-ADR erstellen
- Datenmodell für PostgreSQL skizzieren
- Auth-Konzept definieren
- Datenschutz-Folgen prüfen
- Offline-/Online-Konflikte beschreiben

Abnahme:

- klare Entscheidung: Lokal-only, Self-hosted oder SaaS
- kein Backend-Code ohne Architekturentscheidung

## Milestone 6 – Self-hosted/Sync-Prototyp optional

Ziel: Mehrgerätefähigkeit ohne Kontrollverlust.

Möglicher Lieferumfang:

- Docker Compose
- API
- PostgreSQL
- Login/OIDC optional
- Projekt-Sync
- Backup/Restore

Abnahme:

- lokale Nutzung bleibt möglich
- Sync ist optional
- Datenschutzkonzept liegt vor
