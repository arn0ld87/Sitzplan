# ADR 0003 – Hybrid-Solver: Greedy-Init + Simulated Annealing

## Status

Akzeptiert

## Datum

2026-05-25

## Kontext

Der Sitzplan-Solver in [src/utils/solver.ts](../../src/utils/solver.ts) war bis Milestone 1 reines Simulated Annealing (SA): zufällige Initialbelegung, dann Tausch-Iterationen mit Abkühlungskurve. Das funktioniert für die Mock-Klasse 8b (10 Schüler:innen, wenige Regeln), kommt aber bei zwei realistischen Lastprofilen an die Grenze:

- **Große Klasse mit vielen Hard-Regeln** (35 Schüler:innen, 30 Regeln, [PFLICHTENHEFT §5.1](../PFLICHTENHEFT.md)): die zufällige Initialbelegung verletzt fast immer mehrere Hard-Rules, SA muss erst diese auflösen und kommt im 2-Sekunden-Budget oft nicht zu einer gültigen Lösung.
- **Engpässe wie Sehschwäche → vordere Reihe**: SA findet die wenigen passenden Plätze durch Zufallsschwankung – stochastisch ineffizient.

Drei Alternativen wurden geprüft:

1. **Reines SA beibehalten, mehr Iterationen.** Verschiebt das Problem, sprengt das Performance-Budget.
2. **Reines Greedy.** Schnell, aber findet keine guten globalen Lösungen, sobald Soft-Constraints und Beziehungen ins Spiel kommen (siehe [HEURISTIC_PLAN.md §6](../HEURISTIC_PLAN.md), Z. 80–110).
3. **Greedy-Init + SA-Verbesserung (Hybrid).** Greedy platziert zuerst die schwierigsten Schüler:innen auf den eindeutig passenden Plätzen (vordere Reihe für Sehschwäche, Türnähe für Barrierefreiheit), SA verbessert anschließend die weichen Beziehungen.

## Entscheidung

Der Solver wird auf einen **Hybrid-Ansatz** umgestellt:

1. `greedyInitialAssignment(students, seats, rules, rng)` sortiert Schüler:innen nach Schwierigkeit (siehe ADR 0004 / Slice 4) und platziert sie nacheinander auf den unter den Constraints noch zulässigen Plätzen mit dem besten lokalen Score. Hard-Position-Regeln werden in dieser Phase priorisiert.
2. Anschließend läuft das bestehende SA auf der greedy gefundenen Initialbelegung – mit verkürzter Schleife, da der Startpunkt schon näher am Optimum liegt.
3. Um nicht in einem lokalen Optimum stecken zu bleiben, werden **`RANDOM_RESTARTS = 8`** unabhängige Hybrid-Läufe ausgeführt; die beste Lösung gewinnt. Alle Kandidaten gehen außerdem in die Dedup-Auswahl der Top-3 ein (siehe ADR-frei, Slice 6).

Der Konstantenwert 8 ist ein Kompromiss aus:
- Genug Vielfalt, damit Random-Restart-Effekt greift (empirisch ab ≈5).
- Klein genug, dass das 2-Sekunden-Performance-Budget gehalten wird (mit reduzierter SA-Schleifenlänge pro Restart).

Die Restart-Anzahl wird in Slice 3 gemessen und ggf. reduziert, bevor Slices 4–6 darauf aufbauen.

## Konsequenzen

### Positiv

- Bei großen Klassen mit Hard-Constraints findet der Solver deutlich schneller eine gültige Lösung, weil die Hard-Rules in der Greedy-Phase aktiv berücksichtigt werden statt durch Zufall aufzulösen.
- Random-Restarts liefern „nebenbei" die Kandidatenmenge für die Dedup-Strategie (Slice 6) – kein separater Algorithmus nötig.
- Die SA-Stage bleibt für Soft-Constraints und Beziehungen verantwortlich, wo sie ohnehin stark ist; sie wird nicht überflüssig.

### Negativ / Kosten

- Die Greedy-Komponente kann lokal optimale, aber global suboptimale Belegungen produzieren – SA + Restarts kompensieren das, garantieren aber nicht den globalen Optimum.
- Ein deterministischer Vergleich gegen den heutigen reinen-SA-Solver wäre mit echten Klassenfixtures sinnvoll. Slice 3 prüft die Test-Fixtures vor dem Cut-over; bei Score-Regression im Schnitt fällt der Hybrid auf reines SA zurück (Konstante umstellbar).
- Mehr Code-Pfade, mehr Tests nötig.

### Folgearbeit

- **Slice 3** implementiert Greedy + Restarts + Seed-Vertrag.
- **Slice 4** ersetzt den Difficulty-Stub durch die echte Heuristik nach [HEURISTIC_PLAN.md §6](../HEURISTIC_PLAN.md).
- **Slice 6** nutzt die Kandidaten der Restarts für die Hamming-Dedup.
- **Slice 7** verankert das Performance-Budget als Vitest-Test.

## Referenzen

- [src/utils/solver.ts](../../src/utils/solver.ts) – aktueller SA-Solver, Ziel der Erweiterung.
- [HEURISTIC_PLAN.md §6](../HEURISTIC_PLAN.md) – Difficulty-Heuristik und Greedy-Strategie.
- [PFLICHTENHEFT.md §5.1](../PFLICHTENHEFT.md) – 2-Sekunden-Performance-Budget bei 35/30.
- [M2_PLAN.md](../M2_PLAN.md) – Milestone-2-Plan, Slices 3–6.
