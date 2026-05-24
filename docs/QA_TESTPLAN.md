# QA Testplan – Sitzplaner

## 1. Ziel

Dieser Testplan definiert, wie der Sitzplaner vor Änderungen, Pull Requests und Releases geprüft wird. Schwerpunkt sind Datenintegrität, Solver-Korrektheit, Import/Export, Bedienbarkeit und Druckansicht.

Die App verarbeitet potenziell personenbezogene Schülerdaten. Fehler sind hier nicht nur kosmetisch, sondern können Datenverlust oder falsche Sitzpläne verursachen. Also ausnahmsweise testen wir, bevor das Chaos Produktion heißt.

## 2. Testumfang

### In Scope

- Build und TypeScript-Kompilierung
- ESLint
- Solver-Logik
- Parser für KI-Befehle
- Storage und Migrationen
- Import/Export
- zentrale UI-Flows
- Druckansicht
- manuelle Smoke-Tests

### Out of Scope MVP

- Backend-Tests
- Authentifizierung
- Lasttests für Server
- Multi-User-Konflikte

## 3. Testarten

| Testart | Werkzeug | Zweck | Pflicht |
|---|---|---|---|
| Typecheck | `npm run build` | TypeScript + Vite Build | ja |
| Lint | `npm run lint` | statische Codequalität | ja |
| Unit Tests | Vitest | Solver, Parser, Storage | ja ab Milestone 1 |
| Component Tests | Testing Library | zentrale Komponenten | soll |
| E2E Smoke | Playwright | Hauptworkflow im Browser | soll |
| Manuell | Browser + Print Preview | UX und Druck | ja vor Release |

## 4. Empfohlene Test-Scripts

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

```bash
npm run lint
npm run build
npm run test:run
```

Falls Tests noch nicht eingeführt sind:

```bash
npm run lint
npm run build
```

## 6. Unit-Test-Prioritäten

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

## 7. Component-/UI-Tests

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

## 8. E2E-Smoke-Test

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

## 9. Manuelle Release-Prüfung

Browser:

- Chrome/Chromium
- Firefox
- Safari, falls verfügbar

Checkliste:

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

## 10. Testdaten

Mindestens drei Testklassen pflegen:

| Testklasse | Zweck |
|---|---|
| klein | 4 Schüler:innen, 4 Plätze, einfache Regeln |
| normal | 25 Schüler:innen, typische Schulklasse |
| konflikt | absichtlich widersprüchliche Regeln |

## 11. Fehlerklassifizierung

| Klasse | Beispiel | Release-Blocker |
|---|---|---|
| Kritisch | Datenverlust, kaputter Import, falsche Hard-Regeln | ja |
| Hoch | Generator liefert keine Vorschläge bei gültigen Eingaben | ja |
| Mittel | UI-Fehler ohne Datenverlust | abhängig |
| Niedrig | Textfehler, kleine Layoutprobleme | nein |

## 12. Definition of Done QA

Eine Änderung ist QA-fertig, wenn:

- Build grün ist
- Lint grün ist
- betroffene Unit-Tests grün sind
- Import/Export nicht gebrochen wurde
- Print-Ansicht bei UI-Änderungen geprüft wurde
- keine neuen personenbezogenen Daten in Logs auftauchen
