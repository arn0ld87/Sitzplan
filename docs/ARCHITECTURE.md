# Architecture – Sitzplaner

## 1. Architekturentscheidung

Der Sitzplaner bleibt zunächst eine lokale Client-only-/Local-first-App.

Begründung:

- Schülerdaten bleiben lokal.
- Deployment ist einfach und günstig.
- Kein Serverbetrieb nötig.
- Lehrkräfte können ohne Account starten.
- Die Web-App ist bereits auf Client-only ausgelegt.
- Die native macOS-App folgt demselben lokalen Prinzip mit `UserDefaults`.

Backend, Sync und Accounts werden erst nach Stabilisierung der lokalen Web- und macOS-App geplant.

## 2. Ist-Architektur

```text
Sitzplaner
├─ Web-App
│  └─ Browser
│     └─ React App
│        ├─ App.tsx                 globaler State, Tabs, Storage
│        ├─ components/             UI-Views
│        ├─ utils/solver.ts          Sitzplanberechnung
│        ├─ utils/parser.ts          regelbasierte KI-Befehle
│        ├─ utils/mockData.ts        Beispielklasse
│        └─ localStorage             Persistenz
└─ macOS-App
   └─ macos/SitzplanMac
      ├─ SwiftPM
      ├─ SwiftUI
      ├─ UserDefaults                lokale Persistenz
      └─ scripts/build-app.sh        App-Bundle-Erzeugung
```

## 3. Ziel-Architektur MVP

```text
Sitzplaner Local-first
├─ Gemeinsames Produktmodell
│  ├─ Klassen
│  ├─ Schüler:innen
│  ├─ Regeln
│  ├─ Raumlayouts
│  └─ Sitzplanvorschläge
├─ Web-App
│  ├─ Domain Layer
│  │  ├─ types.ts
│  │  ├─ validation.ts
│  │  └─ migrations.ts
│  ├─ Application Layer
│  │  ├─ storage.ts
│  │  ├─ importExport.ts
│  │  └─ seatingService.ts
│  ├─ Solver Layer
│  │  ├─ solver.ts
│  │  ├─ scoring.ts
│  │  └─ conflictAnalysis.ts
│  ├─ UI Layer
│  │  └─ components/*.tsx
│  └─ localStorage / JSON files
└─ macOS-App
   ├─ SwiftUI Views
   ├─ native State
   ├─ UserDefaults
   └─ später: kompatibler Import/Export
```

## 4. Empfohlene Modulstruktur Web

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

## 5. Empfohlene Struktur macOS

```text
macos/SitzplanMac/
  Package.swift
  README.md
  scripts/
    build-app.sh
  Sources/
    SitzplanMac/
      Models/
      Services/
      Solver/
      Views/
```

Ziel ist nicht zwingend eine identische Code-Struktur zur Web-App. Ziel ist ein kompatibles fachliches Datenmodell und reproduzierbare Tests.

## 6. Datenfluss Web

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

## 7. Datenfluss macOS

```text
SwiftUI Event
  → ViewModel / Service
  → Validierung
  → State-Update
  → UserDefaults speichern
  → SwiftUI Refresh
```

Langfristig soll die macOS-App dieselben fachlichen Regeln erfüllen wie die Web-App. Ob der Solver geteilt oder nativ doppelt implementiert wird, bleibt bewusst offen.

## 8. State-Management

### Web aktuell

React `useState` in `App.tsx`.

### Web Empfehlung MVP

Beibehalten, aber Storage- und Migrationslogik auslagern.

### macOS aktuell

SwiftUI-State und lokale Persistenz über `UserDefaults`.

### Später

Zustand, reducer-basiertes State-Management oder native ViewModels nur einführen, wenn:

- Undo/Redo komplex wird
- mehrere gespeicherte Sitzplanversionen kommen
- Props-/State-Flüsse unübersichtlich werden
- Web und macOS fachlich auseinanderlaufen

## 9. Persistenz

### Web aktuell

- `sitzplaner_classes`
- `sitzplaner_layout`
- `sitzplaner_theme`

### macOS aktuell

- `UserDefaults` für Klassen, Raumlayout und aktive Klasse

### Ziel

- versionierter Storage-Container
- Import/Export mit Schema-Version
- Migrationen pro Version
- Web-/macOS-kompatibles JSON-Format

Empfohlene Web-Datei:

```ts
src/domain/migrations.ts
```

Empfohlener macOS-Bereich:

```text
macos/SitzplanMac/Sources/SitzplanMac/Services/
```

## 10. Security-Architektur

- kein Remote-Tracking
- kein externer API-Call im MVP
- Importdaten validieren
- keine HTML-Injektion aus Schülernamen in der Web-App
- keine Schülerdaten in macOS-Logs
- Exportdateien als personenbezogen kennzeichnen

## 11. Deployment-Architektur

### Web lokal/static

```text
pnpm build
 dist/
  └─ statisch ausliefern
```

Geeignet für:

- GitHub Pages
- Cloudflare Pages
- Netlify
- eigener Nginx/Apache

### macOS lokal

```text
cd macos/SitzplanMac
swift build
swift run SitzplanMac
./scripts/build-app.sh
open dist/Sitzplaner.app
```

Interne macOS-Builds werden zunächst ad-hoc signiert. Öffentliche Distribution braucht später Developer-ID-Signing und Notarisierung.

### Optional self-hosted später

```text
Browser / macOS Client
  → Reverse Proxy
  → API Container
  → PostgreSQL
```

Erst nach ADR.

## 12. Architekturregeln

- Domain-Typen sind fachliche Single Source of Truth.
- UI darf keine Storage-Migrationen enthalten.
- Solver darf keine Browser-APIs kennen.
- Import/Export darf bestehenden State erst nach Validierung überschreiben.
- Neue Features brauchen klare Akzeptanzkriterien.
- Print-CSS bleibt für die Web-App Release-kritisch.
- macOS-App-Bundle bleibt für Desktop-Releases Release-kritisch.
- Web und macOS dürfen fachlich nicht still auseinanderlaufen.

## 13. Architecture Decision Records

Neue grundlegende Entscheidungen werden als ADR dokumentiert:

```text
docs/adr/0001-client-only-first.md
docs/adr/0002-storage-schema-versioning.md
docs/adr/0003-backend-decision.md
docs/adr/0004-web-macos-data-compatibility.md
```

## 14. Erste ADR-Empfehlung

ADR 0001: Client-only-first.

Entscheidung:

- MVP bleibt lokal.
- Keine Accounts.
- Keine Cloud.
- JSON-Export ist offizieller Backup-Weg.
- macOS-App bleibt lokal und nutzt `UserDefaults`.

Konsequenz:

- Datenschutz einfacher.
- Sync fehlt bewusst.
- Nutzer:innen müssen Backups selbst exportieren.
- Web und macOS brauchen kompatible Export-/Import-Strategie.
