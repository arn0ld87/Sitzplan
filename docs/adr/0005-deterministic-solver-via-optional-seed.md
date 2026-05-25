# ADR 0005 – Determinismus via optionalem Seed

## Status

Akzeptiert

## Datum

2026-05-25

## Kontext

Der Solver basiert auf Zufall (SA-Tauschauswahl, Greedy-Tiebreaks, Random-Restarts) und ist deshalb nicht reproduzierbar. Das ist im Produktivbetrieb gewollt – jede Generierung soll frische Vorschläge liefern. Es ist aber ein Problem für:

- **Tests**: Determinismus-Tests („gleicher Input → gleiche Vorschläge") gehen ohne Seed nicht.
- **Reproduzierbare Bug-Reports**: Lehrkraft meldet einen kuriosen Vorschlag, Entwickler kann ihn ohne Seed nicht nachstellen.
- **Performance-Messungen**: Streuung der Laufzeit über zufällige Pfade verfälscht Budget-Tests in Slice 7.

Zwei Alternativen wurden geprüft:

1. **Globaler Seed via Build-Flag.** Ein NODE_ENV-abhängiger Default. Einfach, aber überall sichtbar; Produktion kann „aus Versehen" deterministisch werden.
2. **Optionaler Seed pro Aufruf.** API erweitert um `opts.seed?`; Produktion ruft ohne Seed auf (zufällig), Tests/Reports mit Seed (deterministisch). Saubere Trennung, kein globaler State.

## Entscheidung

Die Solver-API wird um einen **optionalen Seed-Parameter** erweitert:

```ts
export function generateSeatingProposals(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  opts?: { seed?: number }
): SeatingProposal[];
```

Implementierung:

- Neu: [src/utils/rng.ts](../../src/utils/rng.ts) mit einem **Mulberry32**-PRNG. Klein (≈10 Zeilen), deterministisch, seedbar.
- Wenn `opts.seed` gegeben: der Solver erzeugt einen Mulberry32 aus dem Seed und nutzt ihn überall statt `Math.random()`. Greedy-Tiebreaks, SA-Tauschauswahl, Restart-Variation – alles geht durch denselben RNG.
- Wenn `opts.seed` fehlt: der Solver fällt auf `Math.random()` zurück (heutiges Verhalten).
- Die internen Hilfen (SA-Schleife, Greedy) bekommen einen `rng: () => number`-Parameter durchgereicht statt sich auf `Math.random()` zu verlassen.

Der Vertrag ist **rückwärtskompatibel**: bisherige Aufrufer (Generator, Tests) ohne `opts` verhalten sich exakt wie zuvor.

Mulberry32 ist gewählt, weil:
- Einfach genug, um inline zu leben (kein Dependency).
- Für Solver-Zwecke ausreichend gute Verteilung (keine Krypto-Anforderung).
- Schnell.

## Konsequenzen

### Positiv

- Tests können „gleicher Seed → identische `proposals[].assignments`"-Invariante prüfen (Slice 7).
- Reproduzierbare Bug-Reports: Seed im UI optional sichtbar machen wäre eine triviale Erweiterung (out of scope für M2).
- Performance-Tests werden stabiler, weil dieselbe Pfadwahl jeden Lauf erzwungen werden kann.

### Negativ / Kosten

- Jede Zufalls-konsumierende Stelle in `solver.ts` muss `rng()` statt `Math.random()` aufrufen – mechanische Umstellung, in Slice 3 zu erledigen.
- Wer den Solver direkt importiert und Default-Random erwartet, merkt nichts; wer Seed setzt, sollte verstehen, dass die Vorschläge dann statisch sind. Wird in der Funktionsdoku erklärt.

### Folgearbeit

- **Slice 3** liefert `rng.ts` + Vertragsänderung + alle Konsumenten umgestellt.
- **Slice 7** baut Determinismus-Test auf der API auf.

## Referenzen

- `src/utils/rng.ts` – wird in Slice 3 angelegt.
- [src/utils/solver.ts](../../src/utils/solver.ts) – API-Erweiterung, `Math.random`→`rng()` Umstellung.
- [M2_PLAN.md](../M2_PLAN.md) – Slice 3 und 7.
- ADR 0003 – Hybrid-Solver, dessen Greedy-Phase ebenfalls vom Seed profitiert.
