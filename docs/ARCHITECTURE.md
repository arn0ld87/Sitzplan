# Architecture – Sitzplaner

## 1. Architekturentscheidung

Der Sitzplaner bleibt zunächst eine lokale Client-only-App.

Begründung:

- Schülerdaten bleiben im Browser.
- Deployment ist einfach und günstig.
- Kein Serverbetrieb nötig.
- Lehrkräfte können ohne Account starten.
- Der aktuelle Code ist bereits auf Client-only ausgelegt.

Backend, Sync und Accounts werden erst nach Stabilisierung der lokalen App geplant.

## 2. Ist-Architektur

```text
Browser
└─ React App
   ├─ App.tsx                 globaler State, Tabs, Storage
   ├─ components/             UI-Views
   ├─ utils/solver.ts          Sitzplanberechnung
   ├─ utils/parser.ts          regelbasierte KI-Befehle
   ├─ utils/mockData.ts        Beispielklasse
   └─ localStorage             Persistenz
```

## 3. Ziel-Architektur MVP

```text
Browser
└─ React App
   ├─ Domain Layer
   │  ├─ types.ts
   │  ├─ validation.ts
   │  └─ migrations.ts
   ├─ Application Layer
   │  ├─ storage.ts
   │  ├─ importExport.ts
   │  └─ seatingService.ts
   ├─ Solver Layer
   │  ├─ solver.ts
   │  ├─ scoring.ts
   │  └─ conflictAnalysis.ts
   ├─ UI Layer
   │  └─ components/*.tsx
   └─ localStorage / JSON files
```

## 4. Empfohlene Modulstruktur

```text
src/
  domain/
    types.ts
    validation.ts
    migrations.ts
  services/
    storage.ts
    importExport.ts
    seatingService.ts
  solver/
    index.ts
    scoring.ts
    constraints.ts
    conflictAnalysis.ts
  components/
  utils/
```

Migration nicht sofort erzwingen. Erst neue Module ergänzen, dann bestehende Logik schrittweise verschieben.

## 5. Datenfluss

```text
UI Event
  → Handler in App/service
  → Validierung
  → State-Update
  → Persistenz
  → UI Refresh
```

Generator:

```text
activeClass + selectedLayout
  → validateGenerationInput
  → generateSeatingProposals
  → evaluateHardConstraints
  → scoreSoftConstraints
  → return proposals + diagnostics
```

## 6. State-Management

### Aktuell

React `useState` in `App.tsx`.

### Empfehlung MVP

Beibehalten, aber Storage- und Migrationslogik auslagern.

### Später

Zustand oder reducer-basiertes State-Management nur einführen, wenn:

- Undo/Redo komplex wird
- mehrere gespeicherte Sitzplanversionen kommen
- Props-Drilling unübersichtlich wird

## 7. Persistenz

### Aktuell

- `sitzplaner_classes`
- `sitzplaner_layout`
- `sitzplaner_theme`

### Ziel

- versionierter Storage-Container
- Import/Export mit Schema-Version
- Migrationen pro Version

Empfohlene Datei:

```ts
src/domain/migrations.ts
```

## 8. Security-Architektur

- kein Remote-Tracking
- kein externer API-Call im MVP
- Importdaten validieren
- keine HTML-Injektion aus Schülernamen
- Exportdateien als personenbezogen kennzeichnen

## 9. Deployment-Architektur

### Lokal/static

```text
npm run build
 dist/
  └─ statisch ausliefern
```

Geeignet für:

- GitHub Pages
- Cloudflare Pages
- Netlify
- eigener Nginx/Apache

### Optional self-hosted später

```text
Browser
  → Reverse Proxy
  → API Container
  → PostgreSQL
```

Erst nach ADR.

## 10. Architekturregeln

- Domain-Typen sind Single Source of Truth.
- UI darf keine Storage-Migrationen enthalten.
- Solver darf keine Browser-APIs kennen.
- Import/Export darf bestehenden State erst nach Validierung überschreiben.
- Neue Features brauchen klare Akzeptanzkriterien.
- Print-CSS bleibt Release-kritisch.

## 11. Architecture Decision Records

Neue grundlegende Entscheidungen werden als ADR dokumentiert:

```text
docs/adr/0001-client-only-first.md
docs/adr/0002-storage-schema-versioning.md
docs/adr/0003-backend-decision.md
```

## 12. Erste ADR-Empfehlung

ADR 0001: Client-only-first.

Entscheidung:

- MVP bleibt lokal.
- Keine Accounts.
- Keine Cloud.
- JSON-Export ist offizieller Backup-Weg.

Konsequenz:

- Datenschutz einfacher.
- Sync fehlt bewusst.
- Nutzer:innen müssen Backups selbst exportieren.
