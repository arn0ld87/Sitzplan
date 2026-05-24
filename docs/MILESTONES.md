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

Ziel: Die vorhandene lokale App wird stabil und testbar.

Pflichtaufgaben:

- Storage-Format versionieren
- Migration für bestehende `localStorage`-Daten einführen
- Importvalidierung ergänzen
- Exportformat dokumentieren
- IDs auf `crypto.randomUUID()` für neue Daten umstellen
- Fehlermeldungen für Import/Storage verbessern
- Schülerlöschung und Regelbereinigung testen
- Solver-Unit-Tests einführen
- CI mit Build und Lint einrichten

Abnahme:

- `npm run lint` grün
- `npm run build` grün
- Solver-Basistests grün
- Import kaputter JSON-Dateien zerstört keine Daten
- vorhandene Nutzerdaten werden migriert

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
