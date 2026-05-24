# QA Testplan – Sitzplaner

## 1. Ziel

Dieser Testplan definiert, wie der Sitzplaner vor Änderungen, Pull Requests und Releases geprüft wird. Schwerpunkt sind Datenintegrität, Solver-Korrektheit, Import/Export, Bedienbarkeit, Druckansicht und die native macOS-App.

Die App verarbeitet potenziell personenbezogene Schülerdaten. Fehler sind hier nicht nur kosmetisch, sondern können Datenverlust oder falsche Sitzpläne verursachen. Also ausnahmsweise testen wir, bevor das Chaos Produktion heißt.

## 2. Testumfang

### In Scope

- Web-Build und TypeScript-Kompilierung
- ESLint
- SwiftPM-Build der macOS-App
- macOS-App-Bundle-Erzeugung
- Solver-Logik
- Parser für KI-Befehle
- Storage und Migrationen
- Web: `localStorage`
- macOS: `UserDefaults`
- Import/Export
- zentrale UI-Flows
- Druckansicht Web
- lokale macOS-App-Nutzung
- manuelle Smoke-Tests

### Out of Scope MVP

- Backend-Tests
- Authentifizierung
- Lasttests für Server
- Multi-User-Konflikte
- Apple Notarisierung als Pflichtprozess

## 3. Testarten

| Testart | Werkzeug | Zweck | Pflicht |
|---|---|---|---|
| Web Typecheck | `pnpm build` | TypeScript + Vite Build | ja |
| Web Lint | `pnpm lint` | statische Codequalität | ja |
| Web Unit Tests | Vitest | Solver, Parser, Storage | ja ab Milestone 1 |
| Web Component Tests | Testing Library | zentrale Komponenten | soll |
| Web E2E Smoke | Playwright | Hauptworkflow im Browser | soll |
| macOS Build | `swift build` | SwiftPM-Projekt baut | ja bei macOS-Änderungen |
| macOS Run | `swift run SitzplanMac` | App startet lokal | ja bei macOS-Änderungen |
| macOS Bundle | `./scripts/build-app.sh` | `.app` erzeugbar | ja vor macOS-Release |
| Manuell | Browser + macOS-App + Print Preview | UX, Druck, lokale Nutzung | ja vor Release |

## 4. Empfohlene Test-Scripts Web

Zielzustand in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "e2e": "playwright test"
  }
}
```

## 5. Pflicht-Checks vor jedem Commit

Web:

```bash
pnpm lint
pnpm build
pnpm test:run
```

Falls Tests noch nicht eingeführt sind:

```bash
pnpm lint
pnpm build
```

macOS bei Änderungen unter `macos/SitzplanMac`:

```bash
cd macos/SitzplanMac
swift build
swift run SitzplanMac
./scripts/build-app.sh
```

## 6. Unit-Test-Prioritäten Web

### 6.1 Solver

Datei-Vorschlag:

```text
src/solver/__tests__/solver.test.ts
```

Pflichttests:

- generiert vollständige Zuordnung bei ausreichend Sitzplätzen
- gibt Fehler/Diagnose bei zu wenigen Sitzplätzen
- hält `not_beside` als Hard-Constraint ein
- wertet `beside` als Soft-Constraint positiv
- platziert Sehschwäche/Hörschwäche bevorzugt vorne
- behandelt Barrierefreiheit nahe Tür oder Rand
- erzeugt keine doppelten Schülerzuordnungen
- erzeugt keine doppelten Sitzplatzzuordnungen

### 6.2 Parser

Datei-Vorschlag:

```text
src/utils/__tests__/parser.test.ts
```

Pflichttests:

- „Setze A neben B“ erzeugt `beside`
- „Trenne A und B“ erzeugt `not_beside`
- „A nach vorne“ erzeugt `front`
- unbekannte Namen erzeugen klare Fehlermeldung
- mehrdeutige Eingaben werden nicht still falsch interpretiert

### 6.3 Storage/Migration

Datei-Vorschlag:

```text
src/domain/__tests__/migrations.test.ts
```

Pflichttests:

- altes `localStorage`-Format wird erkannt
- Migration erzeugt `schemaVersion`
- kaputte JSON-Daten löschen keinen Bestand
- Export enthält Metadaten
- Import validiert Pflichtfelder

## 7. macOS-Testprioritäten

### 7.1 Build und Start

Pflichttests manuell oder später automatisiert:

- `swift build` läuft erfolgreich
- `swift run SitzplanMac` startet die App
- `./scripts/build-app.sh` erzeugt `dist/Sitzplaner.app`
- `open dist/Sitzplaner.app` öffnet die App
- `Info.plist` enthält korrekten Bundle-Namen und Mindestversion
- ad-hoc Codesigning läuft lokal durch

### 7.2 Persistenz

Pflichttests:

- Klasse anlegen
- App schließen
- App öffnen
- Klasse ist weiterhin vorhanden
- Raumlayout bleibt erhalten
- aktive Klasse bleibt erhalten
- keine Schülerdaten werden in Logs ausgegeben

### 7.3 Web-/macOS-Kompatibilität

Sobald Export/Import auf beiden Plattformen existiert:

- Web-Export in macOS importierbar
- macOS-Export in Web importierbar
- Schema-Version wird auf beiden Seiten erkannt
- ungültige Datei zerstört auf keiner Plattform vorhandene Daten

## 8. Component-/UI-Tests Web

Priorität:

1. Dashboard
2. StudentMgmt
3. RuleMgmt
4. Generator
5. RoomEditor

Akzeptanz:

- Formulare blockieren leere Pflichtfelder
- Löschen entfernt abhängige Daten korrekt
- aktive Klasse wechselt ohne Datenverlust
- Generator zeigt Warnung bei zu wenigen Sitzplätzen
- Exportbutton erzeugt Dateiinhalt im erwarteten Format

## 9. E2E-Smoke-Test Web

Minimaler Playwright-Flow:

1. App öffnen
2. Beispielklasse laden
3. Schüler:in hinzufügen
4. Regel hinzufügen
5. Raumeditor öffnen
6. Sitzplan generieren
7. Vorschlag anzeigen
8. Export auslösen
9. Druckansicht öffnen oder Print-CSS-Snapshot prüfen

## 10. Manuelle Release-Prüfung

Browser:

- Chrome/Chromium
- Firefox
- Safari, falls verfügbar

macOS:

- macOS 13 oder neuer
- Swift 5.10 oder kompatibel

Checkliste Web:

- App startet ohne Console-Fehler
- Light/Dark Mode funktioniert
- Beispielklasse lädt
- Klassenwechsel funktioniert
- Schüler CRUD funktioniert
- Regeln CRUD funktioniert
- Raumlayout lässt sich ändern
- Generator liefert Vorschläge
- Druckvorschau ist lesbar
- Export/Import funktioniert
- ungültiger Import beschädigt keine Daten

Checkliste macOS:

- SwiftPM-Build grün
- App startet ohne Crash
- App-Bundle startet
- lokale Daten bleiben nach Neustart erhalten
- keine echten Schülerdaten in Logs
- Bundle-Metadaten plausibel

## 11. Testdaten

Mindestens drei Testklassen pflegen:

| Testklasse | Zweck |
|---|---|
| klein | 4 Schüler:innen, 4 Plätze, einfache Regeln |
| normal | 25 Schüler:innen, typische Schulklasse |
| konflikt | absichtlich widersprüchliche Regeln |

Diese Testdaten sollten perspektivisch als JSON-Testfixtures für Web und macOS gemeinsam nutzbar sein.

## 12. Fehlerklassifizierung

| Klasse | Beispiel | Release-Blocker |
|---|---|---|
| Kritisch | Datenverlust, kaputter Import, falsche Hard-Regeln | ja |
| Hoch | Generator liefert keine Vorschläge bei gültigen Eingaben | ja |
| Hoch | macOS-App startet nicht nach Build | ja für macOS-Release |
| Mittel | UI-Fehler ohne Datenverlust | abhängig |
| Niedrig | Textfehler, kleine Layoutprobleme | nein |

## 13. Definition of Done QA

Eine Änderung ist QA-fertig, wenn:

- Web-Build grün ist, falls Web betroffen
- Web-Lint grün ist, falls Web betroffen
- Swift-Build grün ist, falls macOS betroffen
- betroffene Unit-Tests grün sind
- Import/Export nicht gebrochen wurde
- Print-Ansicht bei Web-UI-Änderungen geprüft wurde
- macOS-App-Bundle bei macOS-Release geprüft wurde
- keine neuen personenbezogenen Daten in Logs auftauchen
