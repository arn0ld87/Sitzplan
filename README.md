<div align="center">

# Sitzplaner

**Web-App für Lehrkräfte zur konfliktfreien Sitzplan-Erstellung mit Constraint-Solver, Drag&Drop-Raumeditor und KI-Befehlszeile.**

Klassen anlegen, Schüler:innen mit Förderbedarfen verwalten, harte und weiche Sitzregeln definieren, Raumlayouts visuell bauen und drei bewertete Sitzplan-Vorschläge generieren — alles lokal im Browser, ohne Backend.

[![Repository](https://img.shields.io/badge/GitHub-arn0ld87%2FSitzplan-111?style=flat-square&logo=github)](https://github.com/arn0ld87/Sitzplan)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Storage](https://img.shields.io/badge/Storage-localStorage-555?style=flat-square)](#persistenz)

[Quickstart](#quickstart) · [Features](#features) · [Architektur](#architektur) · [Solver](#solver) · [Datenmodell](#datenmodell) · [Druck](#druck)

</div>

---

> **Status:** Aktive Entwicklung. Kein Backend, keine Cloud, keine Accounts. Alle Daten leben in deinem Browser-Profil (`localStorage`). Export/Import als JSON ist vorgesehen.

## Was ist der Sitzplaner?

Eine Single-Page-React-App, die das wiederkehrende Problem aus dem Lehralltag löst: einen Sitzplan zu bauen, der alle pädagogischen Vorgaben gleichzeitig respektiert — bestimmte Schüler:innen nicht nebeneinander, Förderkinder vorne, befreundete Paare wenn möglich zusammen, Linkshänder am Rand, gute Sicht zur Tafel.

Manuell ist das in einer 28er-Klasse mit fünf Regeln in fünfzehn Minuten unlösbar. Der Solver braucht dafür weniger als eine Sekunde und liefert dazu drei Varianten mit unterschiedlicher Gewichtung.

## Wofür der Sitzplaner gedacht ist

Typische Einsätze:

- Sitzpläne für Klassenräume, Lerngruppen und Fachunterricht erstellen
- Förderkinder, Sehschwächen und Linkshändigkeit strukturell berücksichtigen
- Konflikte zwischen Schüler:innen ohne Diskussion umgehen
- Freundschaftspaare bewusst zusammen oder bewusst getrennt setzen
- Klassenzimmer mit beliebigem Möbel-Layout abbilden (Reihen, U-Form, Gruppentische, Einzeltische)
- Sitzpläne ausdrucken oder als PDF an Vertretungslehrkräfte weitergeben
- Mehrere Klassen parallel pflegen

Nicht-Ziele:

- kein Notenbuch
- kein Stundenplan
- keine Anwesenheitserfassung
- keine Cloud-Synchronisation, kein Multi-Device-Setup
- keine Schüler-Login-Flächen

## Features

| Bereich | Funktion |
|---|---|
| **Klassen** | Mehrere Klassen parallel, Stat-Kacheln zu Schülerzahl, Regelanzahl und letzter Generierung |
| **Schüler:innen** | CRUD inkl. Geschlecht, Förderbedarfe (Sehen, Hören, Konzentration, Mobilität …), Linkshänder-Flag, Notizfeld |
| **Sitzregeln** | Hard-Constraints (blockieren ein Layout) und Soft-Constraints (senken nur den Score) |
| **Raumeditor** | SVG-basierter Drag&Drop für Tische, Tafel, Fenster, Tür — beliebige Layouts |
| **Generator** | Drei Vorschläge gleichzeitig: *Ausgewogen*, *Fokus*, *Freundschaft* — mit Score und Erklärung |
| **KI-Befehle** | Chat-Panel mit Light-NLP-Parser für "Setze X neben Y", "Trenne A und B", "Lisa nach vorn" |
| **Persistenz** | `localStorage`, JSON-Export/Import für Backups oder Schulwechsel |
| **Theming** | Helles und dunkles Theme (Toggle persistent) |
| **Druck** | Optimiertes Print-CSS für DIN A4 quer mit Schüler-Legende |

## Architektur

```text
React 19 + TypeScript + Vite 8 (Client-only)
  └─ Single-Page-App, kein Routing-Lib, Tab-State in App.tsx

src/
  App.tsx              Shell, Tab-Routing, globaler State (classes, layout, theme), localStorage-Bridge
  main.tsx             Vite entry
  types.ts             Domain-Modelle (Student, Rule, ClassroomLayout, Seating, …)
  index.css            Design-System (Apple Pro App OS Tokens) + Print-CSS
  components/
    Dashboard.tsx      Klassenverwaltung, Import/Export, Stat-Kacheln
    StudentMgmt.tsx    Schüler-CRUD + Förderbedarfe
    RuleMgmt.tsx       Sitzregeln (hard/soft)
    RoomEditor.tsx     SVG-Editor für Raumlayout
    Generator.tsx      Solver-Aufruf + Druckansicht + KI-Chat-Panel
  utils/
    solver.ts          Sitzplan-Berechnung (drei Profile)
    parser.ts          NLP-Light für KI-Chat-Befehle
    mockData.ts        Beispielklasse 8b
```

Bewusste Verzichte:

- **Kein UI-Framework** außer `lucide-react` für Icons
- **Kein CSS-in-JS, kein Tailwind** — CSS-Variablen als Design-Tokens
- **Kein State-Manager** (Redux/Zustand) — `useState` in `App.tsx` reicht
- **Kein Router** — Tabs werden über lokalen State umgeschaltet
- **Kein Backend** — keine HTTP-Calls, keine WebSockets

## Quickstart

Voraussetzungen:

- Node.js 18+
- npm (oder pnpm/yarn — `package-lock.json` ist npm)

```bash
git clone https://github.com/arn0ld87/Sitzplan.git
cd Sitzplan

npm install
npm run dev
```

Browser öffnen: <http://localhost:5173> (fallback 5174, wenn 5173 belegt).

### Scripts

```bash
npm run dev      # Vite dev server mit HMR
npm run build    # tsc -b && vite build → dist/
npm run lint     # eslint .
npm run preview  # serve dist/ lokal
```

## Solver

Der Sitzplan-Solver in [`src/utils/solver.ts`](./src/utils/solver.ts) ist ein bewertender Greedy-Algorithmus mit Backtracking-light.

### Profile

Pro Lauf werden drei unterschiedlich gewichtete Vorschläge erzeugt:

| Profil | Priorisiert |
|---|---|
| **Ausgewogen** | Mittlere Gewichtung aller Regeln, Förderbedarfe vorn, gemischte Geschlechter |
| **Fokus** | Pädagogische Hard-Constraints maximal, Freundschaften niedrig gewichtet |
| **Freundschaft** | Befreundete Paare zusammen, sofern keine Hard-Constraints brechen |

### Regelarten

- **Hard-Constraints** blockieren ein Layout vollständig. Beispiel: "Schüler A und B dürfen nie nebeneinander sitzen."
- **Soft-Constraints** senken nur den Score. Beispiel: "Lisa sieht schlecht — möglichst vorne."

### Score-Format

```ts
{
  score: number,                    // kann > 1000 sein (Bonuspunkte sind gewollt)
  violations: SeatingViolation[],   // verletzte Soft-Regeln, hard-Verstöße → kein Vorschlag
  explanation: string               // menschenlesbar für die Lehrkraft
}
```

## Datenmodell

Kerntypen in [`src/types.ts`](./src/types.ts):

```ts
type Student = {
  id: string;                       // crypto.randomUUID()
  name: string;
  gender: 'm' | 'w' | 'd';
  needs: SupportNeed[];             // Sehen, Hören, Konzentration, …
  leftHanded: boolean;
  notes?: string;
};

type Rule = {
  id: string;
  type: 'separate' | 'together' | 'front' | 'back' | 'edge' | 'side';
  hard: boolean;
  subjects: string[];               // Student-IDs
};

type ClassroomLayout = {
  seats: Seat[];                    // x, y, rotation
  features: RoomFeature[];          // Tafel, Tür, Fenster
};
```

## Persistenz

Drei `localStorage`-Keys:

| Key | Inhalt |
|---|---|
| `sitzplaner_classes` | Alle Klassen mit Schüler:innen und Regeln |
| `sitzplaner_layout` | Aktuelles Klassenzimmer-Layout |
| `sitzplaner_theme` | `light` oder `dark` |

Backup-Workflow: Im Dashboard auf *Export* klicken → JSON wird heruntergeladen. *Import* überschreibt den lokalen Stand.

**Warnung:** Browser-Cache-Reset oder Wechsel des Browser-Profils löscht alle Daten. Vor Schulwechsel oder Geräte-Wechsel exportieren.

## Druck

Druck ist primärer Use-Case. Lehrkräfte hängen Pläne ans Whiteboard oder verteilen sie an Vertretungen.

- `Cmd+P` / `Strg+P` auf dem Generator-Tab
- DIN A4 Querformat
- Sitzplan + Schüler-Legende mit ID-Mapping
- Print-spezifische Styles in [`src/index.css`](./src/index.css) unter `@media print`

## Design-System

Die Stylesheet-These ist *"Apple Pro App OS"* — ruhig, dicht, ohne Web-Bling. Tokens leben in `src/index.css`:

```css
--accent     /* Primärakzent für Buttons, aktive Tabs */
--ink        /* Haupttext */
--surface    /* Karten- und Panelhintergrund */
--line       /* dezente Trennlinien */
--bg-app     /* Seitenhintergrund */
```

Legacy-Tokens (`--primary`, `--text-muted` …) sind auf die neuen Apple-Tokens gemappt und bleiben rückwärtskompatibel.

Dark Mode wird via `data-theme="dark"` auf `<html>` getoggelt.

## Grenzen

- **Single-User, Single-Browser.** Kein Sync, kein Sharing.
- **Solver ist Greedy.** Bei sehr großen Klassen (40+) oder vielen widersprüchlichen Regeln kann es passieren, dass kein konfliktfreier Plan existiert — der Solver meldet das.
- **Keine Validierung von Schülernamen.** Tippfehler bleiben Tippfehler.
- **KI-Chat ist regelbasiert**, kein echtes LLM. Versteht klare Imperative ("Setze X neben Y"), aber keinen Smalltalk.
- **Datenschutz liegt bei dir.** Schülernamen verlassen den Browser nicht — solange du keinen JSON-Export auf einem fremden Gerät öffnest.

## Entwicklungsstatus

Aktiv in Entwicklung. Aktueller Fokus:

- robustere Solver-Heuristik bei vielen Soft-Constraints
- bessere KI-Befehle (mehr Verben, Mehrfach-Subjekte)
- PDF-Export ohne Browser-Print-Dialog
- Klassen-Templates (z.B. "Grundschule 4. Klasse")
- bessere Mobile-Ansicht für den Raumeditor

Beiträge willkommen via Issue oder PR.

## Lizenz

Nicht kommerziell. Frag vor Forks bitte kurz nach.
