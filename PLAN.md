# PLAN.md – Sitzplaner zur vollwertigen App ausbauen

## Zielbild

Der Sitzplaner soll von einer lokalen Single-Page-App zu einer stabilen, produktionsfähigen Anwendung für Lehrkräfte, Schulen und Bildungsträger weiterentwickelt werden.

Aktueller Stand:

- React 19 + TypeScript + Vite
- Client-only, kein Backend
- Persistenz über `localStorage`
- Klassen, Schüler:innen, Regeln, Raumlayout und Solver vorhanden
- Export/Import und Druck sind zentrale Nutzungspfade

Zielzustand:

- verlässliche lokale Nutzung ohne Datenverlust
- optionaler Projekt-/Datei-Export als robustes Backup-Format
- bessere Solver-Qualität und nachvollziehbare Erklärungen
- validiertes Datenmodell mit Migrationen
- Testabdeckung für Solver, Parser und Storage
- später optional: Backend, Accounts, Sync, Mandantenfähigkeit

## Produktstrategie

### Grundsatz

Erst die lokale App stabil machen. Danach erst Backend, Accounts oder Cloud. Sonst entsteht nur ein hübsches Datenverlust-Gerät mit Login-Maske. Die Menschheit hat davon genug.

### Zielgruppen

| Zielgruppe | Bedarf | Priorität |
|---|---|---:|
| Lehrkräfte | schnell Sitzpläne erstellen, drucken, sichern | sehr hoch |
| Vertretungslehrkräfte | lesbare Pläne und Legenden nutzen | hoch |
| Klassenleitungen | mehrere Klassen verwalten | hoch |
| Schulen | standardisierte Vorlagen, Datenschutz, Export | mittel |
| Admins/Träger | zentrale Bereitstellung, Backup, Rollen | später |

## Entwicklungsphasen

### Phase 0 – Bestandsaufnahme und Absicherung

Ziel: Der bestehende Code wird messbar stabil.

Aufgaben:

- Build und Lint als verpflichtende Quality Gates dokumentieren
- aktuelle Datenstruktur erfassen
- bekannte Risiken aufnehmen
- Storage-Keys und Migrationsbedarf definieren
- Solver-Vertrag dokumentieren
- Datenschutz-Annahmen prüfen

Ergebnis:

- Planung, Lastenheft, Pflichtenheft, Heuristikplan, Testplan und Backlog liegen im Repo.

### Phase 1 – Lokales MVP stabilisieren

Ziel: Die bestehende App wird zuverlässig nutzbar.

Pflicht:

- valide Eingaben bei Klassen, Schüler:innen und Regeln
- keine kaputten Regeln nach Löschen von Schüler:innen
- robuste Import-/Export-Validierung
- Speicherformat mit Versionsnummer
- Migration für bestehende `localStorage`-Daten
- Solver-Tests für Hard-/Soft-Constraints
- Print-Ansicht stabilisieren
- leere Zustände und Fehlermeldungen verbessern

Nicht in Phase 1:

- Backend
- Login
- Cloud-Sync
- echtes LLM

### Phase 2 – Produktreife lokale App

Ziel: Die App wirkt wie ein fertiges Werkzeug, nicht wie ein guter Prototyp.

Pflicht:

- Projektdateien importieren/exportieren
- mehrere Raumlayouts pro Klasse
- Sitzplan-Versionen speichern
- Undo/Redo im Raumeditor
- bessere Erklärungen pro Vorschlag
- Konfliktanalyse: Warum gibt es keinen gültigen Plan?
- responsivere Bedienung auf Tablet/Desktop
- Barrierefreiheit nach WCAG-orientierten Basics

### Phase 3 – Optionales Backend

Ziel: Sync und Mehrgeräte-Nutzung ermöglichen, ohne lokale Nutzung zu zerstören.

Varianten:

| Variante | Beschreibung | Empfehlung |
|---|---|---|
| Lokal-only | Browser + JSON-Dateien | Start und MVP |
| Self-hosted Backend | Docker Compose + PostgreSQL | beste technische Kontrolle |
| Cloud/SaaS | zentrale Mandanten-App | erst nach echter Nachfrage |

Backend erst einführen, wenn:

- Storage-Migrationen sauber funktionieren
- Datenmodell stabil ist
- Datenschutzkonzept steht
- echte Nutzer:innen Sync brauchen

### Phase 4 – Organisations-/Schulfähigkeit

Ziel: Mehrere Lehrkräfte und Klassen in einer Organisation verwalten.

Mögliche Features:

- Rollen: Owner, Lehrkraft, Viewer
- OIDC/SSO optional
- Klassen- und Raum-Vorlagen
- Mandantenfähigkeit
- Audit-Log für Änderungen
- verschlüsselte Backups
- Import aus CSV/Excel

## Empfohlener technischer Zielstack

### Kurzfristig

| Bereich | Empfehlung |
|---|---|
| Frontend | React + TypeScript + Vite beibehalten |
| Styling | vorhandenes CSS-Token-System behalten |
| State | vorerst React-State, später ggf. Zustand nur bei echtem Bedarf |
| Persistenz | versioniertes `localStorage` + JSON-Dateien |
| Tests | Vitest + Testing Library + Playwright |
| CI | GitHub Actions: lint, build, test |

### Backend optional ab Phase 3

| Bereich | Empfehlung |
|---|---|
| API | Fastify oder FastAPI |
| DB | PostgreSQL |
| Auth | OIDC-ready Sessions |
| Deployment | Docker Compose |
| Backup | pg_dump + verschlüsselte Artefakte |

## Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Datenverlust durch `localStorage` | hoch | Export, Storage-Versionierung, Warnhinweise |
| Solver findet keinen Plan | mittel/hoch | Konfliktanalyse und bessere Erklärungen |
| Datenschutz bei echten Schülerdaten | hoch | Lokal-first, keine Cloud ohne Konzept |
| UI wird zu komplex | mittel | klare Workflows, keine Feature-Suppe |
| Backend zu früh | hoch | erst lokale App produktreif machen |

## Definition of Done

Eine Funktion gilt als fertig, wenn:

- sie in der UI sichtbar und verständlich ist
- Eingaben validiert werden
- Fehlerzustände behandelt werden
- Daten dauerhaft korrekt gespeichert werden
- Export/Import nicht kaputt geht
- Build und Lint grün sind
- zentrale Logik getestet ist
- Druckansicht nicht beschädigt wurde

## Nächste Schritte

1. Milestone 1 aus `docs/MILESTONES.md` umsetzen.
2. Testsetup nach `docs/QA_TESTPLAN.md` einführen.
3. Storage-Versionierung aus `docs/PFLICHTENHEFT.md` implementieren.
