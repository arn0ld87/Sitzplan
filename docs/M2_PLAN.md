# Milestone 2 — Solver-Qualität & Konfliktanalyse

> Approved Plan, 2026-05-25. Quelle für `/slice` und `slice-implementer`-Subagents.
> Für M2-Status: `/m2-status` (anzulegen). Für Final-Merge: `/finish-m2`.

## Context

Milestone 1 (Commit `6cea200`) ist auf `main` gemergt: Storage, Validation, Vitest-Setup, 49 Tests, 61.7 % Coverage, Lint-Baseline 9/1 (pre-existing, eingefroren). Der Solver in [src/utils/solver.ts](../src/utils/solver.ts) ist Simulated Annealing, erzeugt drei Profile (`balanced`/`focus`/`friendship`), liefert `valid`-Flag und `violations[]`.

**Was M2 liefern muss** ([MILESTONES.md](MILESTONES.md) §"Milestone 2"):
1. Harte Regelverletzungen → `valid:false`
2. Konfliktanalyse bei unlösbaren Regeln
3. Random-Restarts mit echter Vielfalt
4. Schwierigkeitsgewichtung pro Schüler:in
5. Bessere Scoring-Erklärungen
6. Top-3 dedupliziert
7. Erweiterte Hard/Soft-Tests

**Bestätigte Design-Entscheidungen** (User, 2026-05-25):
- Diagnose in `SeatingProposal` eingebettet (kein zweiter Endpoint)
- Algorithmus: **Hybrid** — Greedy-Init ([HEURISTIC_PLAN.md](HEURISTIC_PLAN.md) §6) + SA-Verbesserung
- `generateSeatingProposals(..., opts?: { seed?: number })` — Seed optional, Default zufällig
- Slice-Schnitt: **7 fokussierte Slices**, ein PR am Ende

**Performance-Budget**: < 2 s @ 35 Schüler:innen, 30 Regeln ([PFLICHTENHEFT.md](PFLICHTENHEFT.md) §5.1). Wird in Slice 7 als Vitest-Performance-Test verankert.

**Branch-Setup**: `feat/milestone-2` ist lokal angelegt (von `main`, `6cea200`). Slice-Branches: `feat/m2-slice-<N>-<kebab>` → Merge in `feat/milestone-2`. Am Ende ein einziger PR `feat/milestone-2` → `main`.

## Architektur-Entscheidungen (ADRs)

Drei neue ADRs vor/während der Slices, Format wie [docs/adr/0001-pnpm-als-package-manager.md](adr/0001-pnpm-als-package-manager.md):

- **ADR 0003** — Hybrid-Solver (Greedy + SA), Begründung gegen reine SA und reines Greedy. **Vor Slice 3.**
- **ADR 0004** — Konfliktanalyse in `SeatingProposal.diagnostics` statt separater Endpoint. **Vor Slice 2.**
- **ADR 0005** — Determinismus via optionalem Seed; Default-Random bleibt für Produktion. **Mit Slice 3.**

## Slice-Plan

Worktree-Konvention: `/private/tmp/sitzplan-slice<N>` mit `node_modules`-Symlink (macht `/slice` automatisch). Branch `feat/m2-slice-<N>-<kebab>`, Parent-Branch `feat/milestone-2`. Subagents: `slice-implementer` (Code), `slice-tester` (Tests), `slice-reviewer` (vor Merge).

| # | Titel | Files | Abhängigkeit |
|---|---|---|---|
| 1 | Hard-Violations machen Plan ungültig | [src/utils/solver.ts](../src/utils/solver.ts), [src/utils/solver.test.ts](../src/utils/solver.test.ts), [src/components/Generator.tsx](../src/components/Generator.tsx) | — |
| 2 | Konfliktanalyse + `diagnostics`-Feld | [src/utils/solver.ts](../src/utils/solver.ts), [src/types.ts](../src/types.ts), [src/components/Generator.tsx](../src/components/Generator.tsx) | 1 |
| 3 | Greedy-Init + Random-Restarts + Seed | [src/utils/solver.ts](../src/utils/solver.ts), neu `src/utils/rng.ts` | 1 |
| 4 | Schwierigkeitsgewichtung | [src/utils/solver.ts](../src/utils/solver.ts) | 3 |
| 5 | Scoring-Erklärungen (DE-Strings, pro Violation) | [src/utils/solver.ts](../src/utils/solver.ts), [src/components/Generator.tsx](../src/components/Generator.tsx) | 2 |
| 6 | Dedup-Strategie für Top-3 | [src/utils/solver.ts](../src/utils/solver.ts) | 3 |
| 7 | Test-Erweiterung + Performance-Budget | [src/utils/solver.test.ts](../src/utils/solver.test.ts), neue `src/test/fixtures/m2-*.ts` | 1–6 |

Parallelisierbar: Slice 4 und 5 nach Slice 3 unabhängig. Slice 6 wartet auf 3. Slice 7 ist Sammelposten.

### Slice 1 — Hard-Violations setzen `valid:false`
- Heutiger Stand ([src/utils/solver.ts](../src/utils/solver.ts) Z. 468): `valid` wird gesetzt, aber Aufrufer in [src/components/Generator.tsx](../src/components/Generator.tsx) zeigt ungültige Pläne ohne Warnung an.
- Änderung: UI-Banner "Plan enthält harte Konflikte" wenn `proposal.valid === false`; Solver liefert `valid:false` zuverlässig auch wenn alle drei Profile fehlschlagen.
- Tests: bestehender `CONFLICT`-Test prüft `valid:false`; ergänze Test "alle 3 Profile invalid bei unlösbarem Setup".

### Slice 2 — Konfliktanalyse in `diagnostics`
- Neuer Typ in [src/types.ts](../src/types.ts):
  ```ts
  type SolverDiagnostics = {
    unplacedStudents: string[];
    bottlenecks: { kind: 'frontRow'|'doorAccess'|'window'; required: number; available: number }[];
    contradictoryRules: { ruleIds: string[]; reason: string }[];
  };
  ```
- `SeatingProposal.diagnostics?: SolverDiagnostics`.
- Analyse läuft *vor* dem Solver-Aufruf (Pre-Check der Kapazitäten) plus *nach* dem Restart-Loop (welche Hard-Violations sind übrig).
- UI: kompakter Diagnose-Block unter dem Score in [src/components/Generator.tsx](../src/components/Generator.tsx) — DE-Strings inline, CSS-Token-treu (keine inline-Styles, keine `#hex`-Farben).

### Slice 3 — Greedy-Init + Random-Restarts + Seed
- Neue Helper-Funktion `greedyInitialAssignment(students, seats, rules, rng)` in `solver.ts`: sortiert nach Difficulty (siehe Slice 4 vorgreifend: vorerst `hardRuleCount*10 + softRuleCount*3` als Stub), platziert hard-positions zuerst, restliche greedy.
- `generateSeatingPlan` packt N Restarts (Konstante `RANDOM_RESTARTS = 8`, in ADR 0003 begründet) drumherum — beste Lösung gewinnt, alle Kandidaten gehen in Slice 6 ein.
- `rng` ist seedable: kleiner Mulberry32 in `src/utils/rng.ts`; `Math.random` nur als Fallback.
- Vertragserweiterung: `generateSeatingProposals(students, rules, layout, opts?: { seed?: number })`. Default: `Date.now()` als Seed, aber API ist deterministisch wenn Seed gegeben.

### Slice 4 — Schwierigkeitsgewichtung
- `computeStudentDifficulty(student, rules)` nach [HEURISTIC_PLAN.md](HEURISTIC_PLAN.md) §6 Z. 80-86: `hardRuleCount*10 + softRuleCount*3 + specialNeedsCount*6 + relationCount*4`.
- Greedy-Init nutzt das (statt Stub); SA-Bewertung erhält pro-Schüler-Multiplikator auf Penalty.
- Keine Vertragsänderung.

### Slice 5 — Scoring-Erklärungen
- Jede `SeatingViolation` bekommt verständlichen `description`-String mit Schüler-Name + konkreter Regel (heute oft technisch).
- `proposal.explanation` wird zu einer 3-zeiligen Zusammenfassung: was war Ziel, was wurde erreicht, was bleibt offen.
- DE-Strings inline (kein i18n-Setup, CLAUDE.md-Konvention).

### Slice 6 — Dedup
- Aus allen Kandidaten von Slice 3 (`RANDOM_RESTARTS * 3 Profile`) Top-3 wählen mit:
  1. Höchster Score je Profil-Bias.
  2. Strukturell unterschiedlich: Hamming-Distanz der Sitzplatz-Zuordnung > Schwelle (z. B. ≥ 30 % der Schüler:innen sitzen woanders).
- Falls keine ausreichend distinkten Kandidaten existieren → in `diagnostics.note` vermerken statt schweigend duplizieren. Weiche Reduktion: Schwelle senken bis 3 Vorschläge zurückkommen.

### Slice 7 — Tests & Performance
- Neue Fixtures `src/test/fixtures/m2-large-class.ts` (35 Schüler, 30 Regeln) und `m2-conflict.ts` (Engpässe).
- Tests:
  - **Determinismus**: gleicher Seed → identische `proposal[].assignments`.
  - **Dedup**: 3 Proposals unterscheiden sich in ≥ 30 % der Plätze.
  - **Performance**: `expect(duration).toBeLessThan(2000)` mit `performance.now()`.
  - **Special Needs**: Hörschwäche-Front, Barrierefreiheit-Tür, Konzentration-Fenster (heute ungetestet).
  - **Konfliktanalyse**: bei Engpass enthält `diagnostics.bottlenecks` korrekten Eintrag.
- Coverage-Ziel: `solver.ts` ≥ 75 % (heute ~62 %).

## Infrastruktur-Änderungen

- `.claude/commands/m2-status.md` — Copy von `m1-status.md`, Branch `feat/milestone-2`, Slice-Tabelle aus M2-Sektion.
- `.claude/commands/finish-m2.md` — Copy von `finish-m1.md`, M1→M2-Refs.
- `slice-tester`-Agent verwenden für Slice 7; alle anderen Slices: `slice-implementer` schreibt Code+co-located-Tests, `slice-reviewer` vor Merge.

## Risiken & Gegenmaßnahmen

- **Performance-Budget reißen** durch 8 Restarts × SA-Schleifen → Slice 3 misst sofort, fällt zurück auf weniger Restarts bevor 4–6 anfassen. Performance-Test in Slice 7 ist Blocker.
- **M1-Tests werden rot** durch Vertragsänderung (`opts?` ist optional, also kompatibel) — Slice 3 läuft `pnpm test` nach jeder Änderung.
- **Greedy-Init produziert schlechtere Lösungen als heutiges SA** — ADR 0003 dokumentiert Fallback, Slice 3 vergleicht Scores gegen aktuelle Test-Fixtures bevor SA-Stage geschwächt wird.
- **Dedup wirft alle Kandidaten weg** wenn Schwelle zu strikt — Slice 6 implementiert weiche Reduktion.
- **Gemini Code Assist** wird Inline-Kommentare auf PR posten — Standard-Reply-Loop einplanen, fix-up-Commits auf `feat/milestone-2` direkt.

## Verifikation (vor PR-Open)

1. `pnpm install && pnpm test` — alle Tests grün, neuer Performance-Test < 2 s.
2. `pnpm lint` — keine neuen Findings über Baseline (9/1).
3. `pnpm build` — TypeScript-strict bleibt sauber.
4. Manueller Smoke-Test mit `pnpm dev`: Mockdaten-Klasse 8b laden → Plan erzeugen → Diagnose-Block sichtbar bei künstlich gebauter unlösbarer Regel; Dark/Light umschalten; Print-Preview prüfen.
5. `/m2-status` zeigt alle 7 Slices als gemerged.
6. `/finish-m2` läuft full QA durch, generiert PR-Body.
7. **Ein** `gh pr create` für `feat/milestone-2` → `main` mit allen Slices + 3 ADRs + CHANGELOG-Update.

## Out of Scope (für M3+)

- KI-Chat-Befehle für Konfliktauflösung
- Drag-&-Drop-Override im Generator
- Persistente Solver-Konfiguration (Gewichte als User-Settings)
- Mehrsprachige UI

## Wiedereinstieg im frischen Fenster

```bash
cd /Volumes/T7/Projekte/gemini/sitzplan
git checkout feat/milestone-2     # existiert bereits lokal
cat docs/M2_PLAN.md                # dieser Plan
/slice 1 "hard-violations-invalid" # erste Slice dispatchen
```

Wenn `feat/milestone-2` lokal nicht mehr existiert: `git checkout -b feat/milestone-2 main`.
