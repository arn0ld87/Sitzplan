# AGENTS.md – Sitzplaner

Repo-Guidance für **alle Coding-Agents** (Claude Code, Codex, Cursor, Aider, Continue, Copilot …). Klein, scharf, ohne Tool-spezifisches Vokabular.

## Projekt in einem Satz

Client-side React-19-App auf Vite, in der Lehrkräfte Klassen + Räume modellieren und einen Constraint-Solver konfliktfreie Sitzpläne mit drei Optimierungsprofilen vorschlagen lassen.

## Sprache

Deutsche UI. Code-Identifier, Commit-Messages und Doku auf Englisch. Keine Übersetzungs-Schicht – Strings stehen inline.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

Voraussetzung: Node ≥ 20, npm ≥ 10.

## Build & Quality Gates

| Befehl            | Zweck                                  | Muss vor Commit grün sein |
|-------------------|----------------------------------------|---------------------------|
| `npm run lint`    | ESLint (TS + React Hooks + Refresh)    | ja                        |
| `npm run build`   | `tsc -b && vite build` (strict)         | ja                        |
| `npm run dev`     | Lokale Entwicklung                     | –                         |
| `npm run preview` | Dist-Build lokal previewen             | –                         |

Keine Tests vorhanden. Visuelle Verifikation passiert manuell im Browser, inklusive Print-Preview (Generator-View).

## Verzeichnis-Übersicht

```
src/App.tsx              Shell + globaler State + localStorage-Persistenz
src/types.ts             Domain-Modelle – Single Source of Truth
src/index.css            Apple-Pro-App-OS Design-System + Print-CSS
src/components/*.tsx     5 Top-Level-Views (Dashboard, Students, Rules, Room, Generator)
src/utils/solver.ts      Sitzplan-Solver (hard/soft constraints, 3 Profile)
src/utils/parser.ts      KI-Chat-Befehls-Parser (NLP light)
src/utils/mockData.ts    Beispielklasse 8b
public/                  Statische Assets (favicon)
```

## Codestil & Konventionen

- **TypeScript strict**: Keine impliziten `any`, kein `// @ts-ignore` ohne Begründung.
- **Funktionale Komponenten** + Hooks. Keine Klassenkomponenten.
- **Props-Drilling** ist OK – keine globale Library (Redux/Zustand) einführen ohne klaren Mehrwert.
- **IDs** über `crypto.randomUUID()`.
- **Persistenz**: nur `localStorage`, Keys mit Präfix `sitzplaner_`.
- **Icons**: ausschließlich `lucide-react`. Keine zweite Icon-Lib.
- **Styling**: ausschließlich Klassen aus [src/index.css](src/index.css) + CSS-Variablen. Kein Tailwind, kein CSS-in-JS, kein styled-components, keine Inline-Farben.

## Design-System (Kurzfassung)

Stylesheet ist als Apple Pro App OS gebaut: frosted Materials (Canvas → Chrome → Surface → Elevated), Apple System Blue als einzige Action-Farbe, 0.5px Hairlines, weiche mehrlagige Schatten, Spring-Motion. Volle Token-Liste in `:root` von [src/index.css](src/index.css).

Wichtige Token-Gruppen:
- **Materials**: `--canvas`, `--chrome`, `--surface`, `--surface-2`, `--elevated`
- **Text**: `--ink`, `--ink-2`, `--ink-3`, `--ink-4`
- **Accent**: `--accent`, `--accent-hover`, `--accent-tint`, `--accent-ring`
- **Semantic**: `--green`, `--orange`, `--red`, `--purple`, `--indigo` (+ jeweils `-tint`)
- **Radii**: `--r-xs` (6px) … `--r-2xl` (28px), `--r-pill`
- **Motion**: `--t-fast` (140ms), `--t-base` (220ms), `--t-spring` (320ms)

Dark Mode via `data-theme="dark"` auf `<html>`. Persistiert in `localStorage["sitzplaner_theme"]`.

## Was NICHT verändert werden darf

- **Print-Block** (`@media print { … }`) am Ende von `src/index.css`. Lehrkräfte drucken Pläne – primärer Use-Case.
- **Legacy-Token-Mapping** in `:root` (`--primary`, `--bg-app`, `--text-muted` …). Komponenten lesen diese Aliase weiter.
- **localStorage-Keys** ohne Migration umbenennen – User verlieren ihre Klassen.
- **Komponenten-Schnitt** ohne Grund refactoren. Die 5 Views entsprechen den 5 Sidebar-Tabs.

## Solver-Vertrag

`utils/solver.ts` exportiert eine Funktion, die `Student[]`, `Rule[]` und `ClassroomLayout` nimmt und drei `SeatingProposal` zurückgibt. Jeder Proposal hat:

```ts
{ id, name, assignments: Record<deskId, studentId>, score: number, violations: SeatingViolation[], explanation: string }
```

Score-Skala ist nicht auf 1000 normalisiert – Bonuspunkte erlauben höhere Werte.

## Wenn du Code änderst

1. Domain-Modell stabil halten – Änderungen in `src/types.ts` brechen Storage-Format.
2. Bei Storage-Format-Änderung: Migration in `App.tsx` ergänzen (lesen, transformieren, neu schreiben).
3. Bei neuen Klassennamen in JSX: zugehöriges CSS in `index.css` ergänzen, nicht inline stylen.
4. Vor PR: lokal `npm run build` + manueller Smoke-Test (Dashboard → Beispielklasse laden → Generator → Plan drucken).

## Nicht-Ziele

- Server / Backend / Multi-User-Sync
- Authentifizierung
- i18n (UI bleibt DE-only)
- Mobile-First (Desktop ist primär, Mobile responsive ergänzt)
- Tests (für jetzt; einführen ist ein eigener Task, nicht Beifang)
