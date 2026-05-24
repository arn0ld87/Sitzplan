# Changelog

Alle nennenswerten Änderungen am Sitzplaner werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/) und [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased] – Milestone 1: MVP-Härtung lokal

Branch: `feat/milestone-1`. Stand: 2026-05-25.

### Hinzugefügt

- Versionierter `localStorage`-Container mit Envelope `{ schemaVersion, data }` für Klassen und Raumlayout (`src/utils/storage.ts`). Siehe ADR 0002.
- Migration für Legacy-Daten ohne Schema-Version (v0 → v1).
- Schema-Validierung beim Import (`src/utils/validation.ts`) mit pfadbasierten Fehlermeldungen wie `classes[2].students[5].name: erwartet string, war number`.
- Fehlerbanner im Dashboard bei kaputter Importdatei — bestehender State bleibt unangetastet, bis zu 5 Fehler werden gezeigt, Banner schließbar.
- ID-Wrapper `newId(prefix?)` über `crypto.randomUUID()` (`src/utils/ids.ts`). Alle Entitäts-IDs (Klassen, Schüler:innen, Regeln, Raumelemente, Vorschläge) verwenden ihn.
- `valid: boolean`-Flag auf `SeatingProposal` — Vorschläge mit Hard-Violations werden als ungültig markiert.
- Diagnose-Anzeige im Generator: rotes "UNGÜLTIG"-Badge pro Vorschlag mit Hard-Violations, Top-Level-Diagnose-Panel mit aggregierter Liste der blockierenden Regeln, wenn kein Vorschlag gültig ist.
- Bestätigungsdialog vor Schülerlöschung (`StudentMgmt.tsx`).
- Automatische Regel-Bereinigung beim Schülerlöschen — Regeln mit Bezug auf den gelöschten Schüler werden entfernt.
- GitHub Actions Workflow `.github/workflows/ci.yml` (Pflichtenheft §7) — Lint, Build, optional Tests, mit Concurrency-Cancel.
- ADR 0002 (`docs/adr/0002-storage-schema-versioning.md`).

### Geändert

- `App.tsx` `useState`-Init lädt jetzt über die Storage-Utility, nicht mehr direkt aus `localStorage`.
- Speicher-`useEffect`s sind durch `useRef`-Gate geschützt — feuern erst nach echter Mutation, nicht beim initialen Mount. Schützt Bestandsdaten vor versehentlichem Überschreiben mit leerem Default.

### Behoben

- `localStorage`-Daten aus zukünftigen App-Versionen werden nicht mehr durch ältere Instanzen still überschrieben.
- Ungültige Import-JSON kann den App-State nicht mehr zerstören.

### Bekannt offen

- ESLint zeigt 9 Probleme (8 Errors, 1 Warning) aus pre-existing Code in `Generator.tsx`, `parser.ts`, `solver.ts`. Kein M1-Regress; CI-Workflow ist aktiv, läuft aber rot bis zur Lint-Bereinigung. Aufgabe für Folge-Slice.
- Vitest und Tests fehlen noch (Slice 6 in Arbeit).
- Export-Dateiname und -Format weichen vom Pflichtenheft-Ziel (`SitzplanerProjectFile` mit `exportedAt`, `appVersion`) ab. Validierung akzeptiert bereits beide Formen, Export-Pfad bleibt aber unverändert — Folgearbeit.
