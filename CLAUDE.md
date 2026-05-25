# CLAUDE.md – Sitzplaner

Projekt-spezifische Instructions für Claude Code. **Hat Vorrang vor globaler CLAUDE.md.**

## Was ist das

Web-App für Lehrkräfte (DE) zur Sitzplan-Erstellung. Verwaltet Klassen, Schüler, Sitzregeln und Klassenzimmer-Layouts. Generiert konfliktfreie Sitzpläne mit Constraint-Solver. Daten leben in `localStorage`, optional JSON-Export/Import. Komplett client-side, kein Backend.

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **lucide-react** für Icons (einziges UI-Lib)
- **CSS-Variablen** für Theming (kein Tailwind, kein CSS-in-JS)
- Kein Test-Framework eingerichtet
- Persistenz: `localStorage` Keys `sitzplaner_classes`, `sitzplaner_layout`, `sitzplaner_theme`

## Scripts

**Package-Manager: pnpm.** Kein `npm`, kein `yarn`. Lockfile ist `pnpm-lock.yaml`. `package-lock.json` ist Altlast und wird entfernt.

```bash
pnpm install     # Dependencies
pnpm dev         # Vite dev server (Port 5173, fallback 5174)
pnpm build       # tsc -b && vite build
pnpm lint        # eslint .
pnpm test        # vitest run (sobald eingerichtet)
pnpm preview     # serve dist/
```

## Architektur (kurz)

```
src/
  App.tsx              ← Shell, Tab-Routing, State (classes/layout/theme), localStorage
  main.tsx             ← Vite entry
  types.ts             ← Domain-Modelle (Student, Rule, ClassroomLayout, …)
  index.css            ← Design-System (Apple Pro App OS Tokens) + Print-CSS
  components/
    Dashboard.tsx      ← Klassenverwaltung, Import/Export, Stat-Kacheln
    StudentMgmt.tsx    ← Schüler-CRUD + Förderbedarfe
    RuleMgmt.tsx       ← Sitzregeln (hard/soft constraints)
    RoomEditor.tsx     ← Drag&Drop SVG-Editor für Raumlayout
    Generator.tsx      ← Solver-Aufruf + Druck + KI-Chat-Panel
  utils/
    solver.ts          ← Sitzplan-Berechnung (mehrere Profile)
    parser.ts          ← NLP-Light für KI-Chat-Befehle
    mockData.ts        ← Beispielklasse 8b
```

## Design-System – Hard Rules

Das Stylesheet [src/index.css](src/index.css) ist die **single source of truth** für Optik. These: *"Apple Pro App OS"*.

- **NIE** inline-Styles statt CSS-Klassen einführen, wenn eine Klasse passt. Stat-Kacheln im Dashboard sind die einzige akzeptierte Ausnahme (historisch).
- **NIE** Farben hardcoden (`#xxxxxx` direkt in Komponenten). Immer Tokens: `var(--accent)`, `var(--ink)`, `var(--surface)`, `var(--line)` …
- **NIE** den Print-Block (`@media print { … }`) am Ende von `index.css` löschen oder kürzen ohne Test. Lehrkräfte drucken Pläne – das ist primärer Use-Case.
- **NIE** Tab-Klassennamen (`tab-btn`, `active`), Card-Klassen (`card`, `card-title`), Form-Klassen (`form-input`, `form-select`, `form-label`) ohne CSS-Update umbenennen.
- **Legacy-Tokens** (`--primary`, `--accent`, `--bg-app`, `--text-muted`) sind in `:root` auf die neuen Apple-Tokens **gemappt** und dürfen nicht entfernt werden – Komponenten lesen sie weiter.
- Dark Mode wird via `data-theme="dark"` auf `<html>` toggled, persistent in `localStorage`.

## Komponenten-Konventionen

- Komponenten sind **stateless** wo möglich – State lebt in `App.tsx`.
- Handler kommen als Props (`onAddStudent`, `onUpdateLayout` …). Komponenten mutieren nichts direkt.
- IDs: `crypto.randomUUID()`. Niemals `Date.now()` als ID.
- Deutsche UI-Strings inline (kein i18n-Setup).

## Solver (utils/solver.ts)

- Erzeugt **drei** Vorschläge (Ausgewogen / Fokus / Freundschaft) mit unterschiedlichen Gewichten.
- Hard-Regeln blockieren ein Layout. Soft-Regeln senken nur den Score.
- Score-Format: `{ score: number, violations: SeatingViolation[], explanation: string }`.
- Score über 1000 ist möglich – das ist gewollt (Bonuspunkte).

## Was Claude NICHT anfassen soll

- `dist/` – Build-Output, wird vom `build`-Script regeneriert.
- `node_modules/` – Trivialerweise.
- `.code-review-graph/` – Persistenter Graph des CRG-MCP. Nicht editieren.
- `public/` – Statische Assets, nur ergänzen, nicht umstrukturieren.

## Workflow für Änderungen

1. Vor Edits: **`code-review-graph` (CRG) MCP zuerst** — `semantic_search_nodes`, `query_graph`, `get_impact_radius`, `detect_changes`. Erst wenn der Graph nicht ausreicht, auf Grep/Glob/Read ausweichen. Begründung: schneller, billiger (weniger Tokens), strukturkontextbewusst (Caller/Callees/Tests). Siehe auch `/Volumes/T7/Projekte/CLAUDE.md`.
2. **`context-mode` MCP für Bulk-Shell und Such-Aggregation** — `ctx_batch_execute` für mehrere Shell-Commands plus Suchen in einem Call, `ctx_execute_file` für Code-Analyse großer Files. Bash bleibt nur für `git`, `mkdir`, `rm`, `mv`, Navigation. Hintergrund: rohe Tool-Outputs flooden das Context-Window — context-mode hält die Daten im Sandbox und zieht nur die Zusammenfassung herein.
3. Lokal: `pnpm dev` → visuell verifizieren im Browser (Dark + Light umschalten).
4. Vor Commit: `pnpm build` muss grün sein. ESLint warnings dürfen nicht zunehmen.
5. Bei UI-Änderungen: Print-Preview testen (`Cmd+P` im Browser auf Generator-View).

### MCP-Pipeline (Kurzreferenz)

| Zweck | Tool |
|---|---|
| Code-Exploration, Review, Impact | `code-review-graph` (`semantic_search_nodes`, `detect_changes`, `get_impact_radius`, `query_graph`) |
| Mehrere Shell-Commands + Suchen in einem Call | `ctx_batch_execute` |
| Einzel-Analyse, große Logs, API-Calls | `ctx_execute` / `ctx_execute_file` |
| Webseite fetchen + indexieren | `ctx_fetch_and_index` (statt `curl`/`WebFetch`) |
| Datei lesen für Edit | `Read` → `Edit`/`Write` |
| Library-Docs (React, Vite, Vitest, etc.) | `context7` (`resolve-library-id` → `query-docs`) |

## Pitfalls aus der Vergangenheit

- React 19 + Vite 8 sind frisch. Bei kuriosen Build-Fehlern zuerst `rm -rf node_modules dist && pnpm install` probieren.
- `lucide-react` v1.x hat andere Icon-Namen als v0.x – Naming-Kollisionen möglich.
- `tsc -b` ist strict. Implizite `any` werden hart abgelehnt.
