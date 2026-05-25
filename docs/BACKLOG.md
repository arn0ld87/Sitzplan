# Backlog – Sitzplaner

## Priorisierung

| Priorität | Bedeutung |
|---|---|
| P0 | blockiert produktive Nutzung oder gefährdet Daten |
| P1 | wichtig für MVP und Nutzervertrauen |
| P2 | verbessert Bedienung/Qualität deutlich |
| P3 | spätere Ausbaustufe |

## P0 – Sofort relevant

> Status 2026-05-25: P0-Items "Storage versionieren", "Import validieren", "Solver-Hard-Constraints härten" sind auf `feat/milestone-1` umgesetzt. CI eingerichtet (Job grün, sobald Lint-Baseline geräumt ist). Solver-Tests (P1) als Slice 6 noch offen. macOS-Build-Härtung separat.

### Storage versionieren

**Problem:** Aktuell liegen Daten direkt in `localStorage` bzw. in der macOS-App in `UserDefaults`. Ohne Schema-Version sind spätere Änderungen riskant.

Akzeptanzkriterien:

- Export enthält `schemaVersion`
- App erkennt alte Daten
- Migration läuft ohne Datenverlust
- fehlerhafte Daten werden nicht überschrieben
- Web und macOS bekommen perspektivisch ein kompatibles Projektschema

### Import validieren

**Problem:** Ungültige JSON-Dateien können State beschädigen.

Akzeptanzkriterien:

- Import prüft Pflichtfelder
- falsche Datei zeigt Fehlermeldung
- bestehende Daten bleiben erhalten
- Import kann abgebrochen werden

### Solver-Hard-Constraints härten

**Problem:** Harte Regelverletzungen dürfen nicht als normale Vorschläge erscheinen.

Akzeptanzkriterien:

- gültiger Vorschlag hat 0 Hard-Violations
- Hard-Violations werden als Diagnose angezeigt
- Tests decken `not_beside`, `front`, `near_door` ab

### CI einrichten

Akzeptanzkriterien:

- GitHub Actions für `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`
- später zusätzlich `pnpm test`
- macOS-Pfadänderungen lösen mindestens `swift build` aus
- PRs ohne grüne relevante Builds gelten als nicht mergefähig

### macOS-Build absichern

Akzeptanzkriterien:

- `cd macos/SitzplanMac && swift build` dokumentiert und geprüft
- `./scripts/build-app.sh` erzeugt `dist/Sitzplaner.app`
- App-Bundle startet lokal
- keine echten Schülerdaten in macOS-Logs

## P1 – MVP verbessern

### Vitest einführen

Akzeptanzkriterien:

- `pnpm test` existiert
- Solver-Basistests vorhanden
- Parser-Basistests vorhanden
- Storage-Migrationstest vorhanden

### Konfliktanalyse implementieren

Akzeptanzkriterien:

- zu wenige Sitzplätze wird konkret gemeldet
- widersprüchliche Regeln werden erkannt
- Förderbedarfsengpässe werden erklärt

### CSV-Import für Schülerlisten

Akzeptanzkriterien:

- CSV mit Spalte `name` importierbar
- optionale Spalte `specialNeeds`
- Vorschau vor Import
- Duplikate werden gewarnt

### Projektdatei exportieren

Akzeptanzkriterien:

- Exportdatei enthält Metadaten
- Dateiname enthält Datum
- Import erkennt App-Format
- Exportformat ist als Ziel auch für macOS nutzbar

### Web-/macOS-Datenkompatibilität klären

Akzeptanzkriterien:

- gemeinsames JSON-Schema dokumentiert
- Web-Export und macOS-Import als Ziel definiert
- macOS-Export und Web-Import als Ziel definiert
- Drift-Risiken zwischen TypeScript- und Swift-Modellen dokumentiert

## P2 – Produktreife

### Mehrere Layouts pro Klasse

Akzeptanzkriterien:

- Klasse kann mehrere Räume/Layoutvarianten speichern
- aktives Layout wählbar
- Generator nutzt ausgewähltes Layout

### Sitzplan-Versionen speichern

Akzeptanzkriterien:

- generierter Vorschlag kann gespeichert werden
- gespeicherter Plan kann erneut angezeigt werden
- Version enthält Datum und Profil

### Undo/Redo im Raumeditor

Akzeptanzkriterien:

- letzte Änderungen rückgängig machen
- Redo möglich
- keine kaputten Layoutzustände

### PDF-Export prüfen

Akzeptanzkriterien:

- entweder sauberer Browserdruck dokumentiert
- oder PDF-Export per Client-Library evaluiert
- Datenschutz bleibt lokal

### macOS-Distribution verbessern

Akzeptanzkriterien:

- App-Icon definiert
- Bundle-Version gepflegt
- Release-Artefakt als ZIP oder DMG vorbereitet
- Notarisierung als spätere Option dokumentiert

## P3 – Später

### Optionales Backend

Akzeptanzkriterien:

- ADR liegt vor
- Datenschutzkonzept liegt vor
- Sync-Konflikte sind beschrieben

### OIDC/SSO

Akzeptanzkriterien:

- nur mit Backend
- Rollenmodell vorhanden
- Sessions sicher konzipiert

### KI-Unterstützung

Akzeptanzkriterien:

- keine Schülerdaten an externe Dienste ohne Warnung
- lokal oder optional konfigurierbar
- Parser bleibt als Fallback erhalten

### Auto-Update macOS prüfen

Akzeptanzkriterien:

- Sparkle oder Alternative bewertet
- Signatur-/Update-Risiken dokumentiert
- nicht vor produktreifer lokaler Version umsetzen

## Technische Schulden

- `Date.now()`-IDs durch `crypto.randomUUID()` ersetzen
- Storage-Zugriff aus `App.tsx` in Utility auslagern
- Solver in kleinere Einheiten zerlegen
- UI-Strings langfristig strukturieren, auch ohne vollständiges i18n
- Web- und macOS-Datenmodelle fachlich abgleichen
- gemeinsame JSON-Fixtures für Solver/Import/Export erstellen
- README ggf. von Template-Resten befreien, falls noch vorhanden
