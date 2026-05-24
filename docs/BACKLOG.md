# Backlog – Sitzplaner

## Priorisierung

| Priorität | Bedeutung |
|---|---|
| P0 | blockiert produktive Nutzung oder gefährdet Daten |
| P1 | wichtig für MVP und Nutzervertrauen |
| P2 | verbessert Bedienung/Qualität deutlich |
| P3 | spätere Ausbaustufe |

## P0 – Sofort relevant

### Storage versionieren

**Problem:** Aktuell liegen Daten direkt in `localStorage`. Ohne Schema-Version sind spätere Änderungen riskant.

Akzeptanzkriterien:

- Export enthält `schemaVersion`
- App erkennt alte Daten
- Migration läuft ohne Datenverlust
- fehlerhafte Daten werden nicht überschrieben

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

- GitHub Actions für `npm ci`, `npm run lint`, `npm run build`
- später zusätzlich `npm test -- --run`
- PRs ohne grünen Build gelten als nicht mergefähig

## P1 – MVP verbessern

### Vitest einführen

Akzeptanzkriterien:

- `npm test` existiert
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

## Technische Schulden

- `Date.now()`-IDs durch `crypto.randomUUID()` ersetzen
- Storage-Zugriff aus `App.tsx` in Utility auslagern
- Solver in kleinere Einheiten zerlegen
- UI-Strings langfristig strukturieren, auch ohne vollständiges i18n
- README ggf. von Template-Resten befreien, falls noch vorhanden
