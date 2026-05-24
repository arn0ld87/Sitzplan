# Pflichtenheft – Sitzplaner

## 1. Technischer Kontext

Der Sitzplaner ist aktuell eine clientseitige React-App mit TypeScript und Vite. Die Persistenz erfolgt über `localStorage`. Der Solver bewertet Sitzpläne anhand von Schülerdaten, Regeln und Raumlayout.

Technische Grundlage:

- React 19
- TypeScript
- Vite
- CSS-Token-System ohne UI-Framework
- `lucide-react` für Icons
- `localStorage` für Klassen, Layout und Theme

## 2. Systemgrenzen

### In Scope

- Frontend-App
- lokale Persistenz
- Import/Export
- Solver
- Raumeditor
- Druckansicht
- Test- und Release-Prozess

### Out of Scope für MVP

- Backend
- Login
- Cloud-Sync
- echte KI/LLM-Anbindung
- Mehrmandantenfähigkeit

## 3. Datenmodell

### 3.1 Versionierter Speichercontainer

Zukünftiges Export-/Storage-Format:

```ts
export interface SitzplanerProjectFile {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  classes: SchoolClass[];
  layouts: ClassroomLayout[];
  activeClassId?: string;
}
```

### 3.2 Migration

Beim Start muss die App:

1. vorhandene alte `localStorage`-Keys lesen
2. Format erkennen
3. falls nötig migrieren
4. neue Version speichern
5. bei Fehlern bestehende Daten nicht löschen

### 3.3 IDs

- neue IDs sollen mit `crypto.randomUUID()` erzeugt werden
- bestehende IDs bleiben kompatibel
- keine `Date.now()`-IDs für neue Funktionen

## 4. Funktionale Umsetzung

### 4.1 Klassenverwaltung

Komponente: `Dashboard.tsx`

Pflichten:

- Klasse anlegen
- Klasse löschen mit Bestätigung
- aktive Klasse wechseln
- Statistik anzeigen
- Beispielklasse laden
- Export/Import anbieten

Validierung:

- Klassenname darf nicht leer sein
- doppelte Klassennamen werden gewarnt, aber nicht hart blockiert

### 4.2 Schülerverwaltung

Komponente: `StudentMgmt.tsx`

Pflichten:

- Schüler:in anlegen
- Schüler:in bearbeiten
- Schüler:in löschen
- Förderbedarfe mehrfach auswählbar

Validierung:

- Name darf nicht leer sein
- Namen werden getrimmt
- Löschung entfernt abhängige Regeln

### 4.3 Regelverwaltung

Komponente: `RuleMgmt.tsx`

Pflichten:

- Regeltyp auswählen
- harte/weiche Regel auswählen
- Zielperson bei relationalen Regeln erzwingen
- unvollständige Regeln verhindern

Relationale Regeln:

- `beside`
- `not_beside`
- `near`
- `far`

Positionsregeln:

- `front`
- `back`
- `edge`
- `near_door`
- `near_board`
- `not_window`

### 4.4 Raumeditor

Komponente: `RoomEditor.tsx`

Pflichten:

- Elemente hinzufügen
- Elemente verschieben
- Elemente löschen
- Raster berücksichtigen
- Layout speichern

MVP-Erweiterungen:

- Mindestanzahl Sitzplätze prüfen
- Kollisionen optional warnen
- Undo/Redo vorbereiten

### 4.5 Generator und Solver

Komponente: `Generator.tsx`
Hilfslogik: `src/utils/solver.ts`

Pflichten:

- drei Vorschläge erzeugen
- harte Regelverletzungen eindeutig kennzeichnen
- Score anzeigen
- Erklärung anzeigen
- Druckansicht erzeugen

Solver-Vertrag:

```ts
export function generateSeatingProposals(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout
): SeatingProposal[];
```

Akzeptanz:

- keine Vorschläge ohne Sitzplätze
- Warnung bei mehr Schüler:innen als Sitzplätzen
- nachvollziehbare Meldung bei unlösbaren Hard-Constraints

## 5. Nichtfunktionale Anforderungen

### 5.1 Performance

- Zielgröße MVP: 35 Schüler:innen, 35 Sitzplätze, 30 Regeln
- Generierung unter 2 Sekunden auf normalem Notebook
- UI bleibt bedienbar

### 5.2 Sicherheit

- keine ungeprüften HTML-Injektionen
- keine sensiblen Daten in Logs
- Importdaten validieren
- keine Netzwerkübertragung ohne explizite Funktion

### 5.3 Datenschutz

- lokal-first
- keine Telemetrie im MVP
- keine Third-Party-APIs für Schülerdaten
- Exportdateien klar als personenbezogen markieren

### 5.4 Barrierefreiheit

- Formulare mit Labels
- ausreichende Kontraste
- Tastaturbedienung für Hauptaktionen
- sichtbare Fehlermeldungen

## 6. Tests

Einzuführen:

- Vitest für Solver, Parser, Storage-Migration
- React Testing Library für zentrale Komponenten
- Playwright für Smoke-Test

Pflichttests MVP:

- Hard-Constraint `not_beside` wird eingehalten
- Soft-Constraint senkt Score
- Schülerlöschung entfernt Regeln
- Import ungültiger JSON-Dateien überschreibt nichts
- Export enthält `schemaVersion`
- Druck-View rendert ohne Crash

## 7. CI/CD

GitHub Actions Workflow:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

## 8. Betriebsmodell

### MVP

- statische Web-App
- Deployment über GitHub Pages, Netlify, Cloudflare Pages oder eigenen Webserver
- keine Serverdatenbank

### Später

- Docker Compose
- PostgreSQL
- optional OIDC
- Backup/Restore-Konzept

## 9. Abnahme

Technische Abnahme erfolgt, wenn:

- `npm run lint` grün ist
- `npm run build` grün ist
- Tests grün sind
- manuell geprüft:
  - Beispielklasse laden
  - Schüler bearbeiten
  - Regeln setzen
  - Raumlayout ändern
  - Sitzplan generieren
  - Druckvorschau öffnen
  - Export/Import ausführen
