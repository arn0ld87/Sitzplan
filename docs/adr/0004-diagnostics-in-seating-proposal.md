# ADR 0004 – Konfliktanalyse als `SeatingProposal.diagnostics`

## Status

Akzeptiert

## Datum

2026-05-25

## Kontext

Milestone 2 verlangt Konfliktanalyse bei unlösbaren Regelkombinationen ([MILESTONES.md §"Milestone 2"](../MILESTONES.md)). Die Frage war: Wo gehört das Ergebnis hin?

Zwei Alternativen wurden geprüft:

1. **Separater Endpoint `analyzeSeatingConflicts(students, rules, layout): SolverDiagnostics`.**
   Trennt Diagnose und Generierung sauber. Aber: die UI muss zwei Aufrufe orchestrieren, Ergebnisse korrelieren, sich um Konsistenz kümmern (was, wenn beim zweiten Aufruf andere Schüler:innen-Daten gelten?). Für eine client-only-App mit `localStorage` ist das Overhead.
2. **`diagnostics`-Feld direkt im `SeatingProposal`.**
   Der Solver weiß ohnehin nach jedem Lauf, was an Engpässen, widersprüchlichen Regeln und nicht platzierten Schüler:innen übrig ist – er ist die kostengünstigste Stelle, das mitzuliefern. UI rendert es zusammen mit Score und Violations.

## Entscheidung

Die Konfliktanalyse wird **in `SeatingProposal` eingebettet**:

```ts
export interface SolverDiagnostics {
  unplacedStudents: string[];
  bottlenecks: {
    kind: 'frontRow' | 'doorAccess' | 'window';
    required: number;
    available: number;
  }[];
  contradictoryRules: {
    ruleIds: string[];
    reason: string;
  }[];
  note?: string;
}

export interface SeatingProposal {
  // ... bestehende Felder
  diagnostics?: SolverDiagnostics;
}
```

`diagnostics` ist optional, damit ältere Konsument:innen (Tests, Mock-Daten, Drittcode) nicht brechen.

Die Analyse läuft in **zwei Phasen**:
1. **Pre-Check vor dem Solver-Lauf**: Kapazitäten (vordere Reihe, Türnähe, fensterarme Plätze) gegen Anforderungen (Sonderbedarfe + Hard-Positionsregeln) prüfen. Widersprüchliche Hard-Rules (z. B. `beside` + `not_beside` für dasselbe Paar) erkennen.
2. **Post-Analyse nach dem Restart-Loop**: Welche Hard-Violations sind übrig? Welche Schüler:innen wurden nicht platziert? Daraus wird `note` als zusammenfassender DE-String generiert.

Die zusätzliche public Funktion `analyzeSeatingDiagnostics(assignments, students, rules, layout, violations?)` wird exportiert, damit der Generator nach manuellen Drag-&-Drop-Änderungen die Diagnose neu berechnen kann ([src/components/Generator.tsx](../../src/components/Generator.tsx)).

## Konsequenzen

### Positiv

- Ein einziger Aufruf liefert Plan + Diagnose – keine Konsistenzprobleme zwischen zwei Endpoints.
- UI-Code bleibt einfach: `proposal.diagnostics?` rendern, fertig.
- Pre-Check-Phase fängt strukturell unlösbare Setups früh und macht den Bottleneck explizit, statt den User mit „Plan ungültig" alleinzulassen.
- `analyzeSeatingDiagnostics` als eigene exportierte Funktion bleibt für nicht-Solver-Pfade (manueller Edit, KI-Chat) wiederverwendbar.

### Negativ / Kosten

- `SolverDiagnostics` wächst potenziell mit jeder neuen Sonderbedarf-Art (`frontRow`/`doorAccess`/`window`). Vertretbar, da der Typ klein und gut sichtbar in [src/types.ts](../../src/types.ts) lebt.
- Wer Diagnose **ohne** Solver-Lauf braucht (z. B. präventive UI-Warnung bei Regel-Erstellung), muss die exportierte Funktion mit leerer `assignments`-Map aufrufen. Akzeptable Indirektion, kein Showstopper.

### Folgearbeit

- **Slice 5** liefert verständliche DE-Strings pro `SeatingViolation` und füllt `note` mit einer 3-Zeilen-Zusammenfassung.
- **Slice 6** trägt Dedup-Hinweise in `diagnostics.note` ein, wenn nicht genug strukturell verschiedene Vorschläge existieren.

## Referenzen

- [src/utils/solver.ts](../../src/utils/solver.ts) – `analyzeSeatingDiagnostics`, `findContradictoryRules`, Bottleneck-Heuristiken.
- [src/types.ts](../../src/types.ts) – `SolverDiagnostics`, `SeatingProposal.diagnostics`.
- [src/components/Generator.tsx](../../src/components/Generator.tsx) – `renderDiagnosticsPanel`.
- Commit `4c27b4c` – Implementierung dieses ADRs (vorgezogen auf `feat/milestone-2`).
- [M2_PLAN.md](../M2_PLAN.md) – Slices 2 und 5.
