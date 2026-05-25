# Changelog

Alle nennenswerten Änderungen am Sitzplaner werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/) und [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased] – Milestone 3: Raumeditor & Bedienbarkeit

Branch: `feat/milestone-3`. Stand: 2026-05-25 — alle 5 Slices gemerged, 134 Tests grün, bereit für PR.

### Hinzugefügt

- **Kapazitätsanzeige** im Raumeditor: Stats-Bar mit Sitzplatz-Count und Schüler-Count, plus Warn-Banner mit konkretem Defizit, wenn mehr Schüler:innen als Plätze vorhanden sind (`src/utils/layoutCapacity.ts` mit `countDesks`/`isOverCapacity`).
- **Kollisions-Detection** als wiederverwendbare Utility (`src/utils/layoutCollision.ts` mit `wouldOverlap`/`findOverlappingIds`). Überlappende Elemente werden mit roter gestrichelter Stroke + sanftem Puls markiert; in der Stats-Bar erscheint ein „X Kollisionen"-Chip.
- **Undo/Redo** über generischen `useHistoryState`-Hook (`src/hooks/useHistoryState.ts`) — past/present/future-Stack mit konfigurierbarem Limit (default 50). App.tsx leitet alle Layout-Mutationen durch die History; Toolbar im Raumeditor zeigt Undo/Redo-Buttons mit Disabled-State.
- **Tastatur-Shortcuts** im Raumeditor (`src/utils/editorKeymap.ts`): Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z bzw. Ctrl+Y, Pfeiltasten zum Verschieben, Delete/Backspace zum Löschen, Esc zum Deselektieren, R zum Rotieren. Hört auf `document`-Level, überspringt Inputs/Textareas/Selects/contenteditable.
- **Reusable `<EmptyState>`-Komponente** (`src/components/EmptyState.tsx`) mit Icon, Titel, optionaler Beschreibung und optionalem CTA. Eingesetzt im Raumeditor (leerer Raum → CTA „Standard-Layout laden") und in der Schülerliste (leere Klasse).
- **Tests** für alle neuen Utilities + Hook + Komponente: 5 (capacity), 8 (collision), 9 (useHistoryState), 14 (keymap), 5 (EmptyState) — gesamt 134 Tests in 12 Files.

### Geändert

- Inline `checkOverlap` im `RoomEditor` ersetzt durch Import aus `utils/layoutCollision` — kein doppelter Code mehr.
- Default-Theme jetzt `light` (vorher `dark`); gespeicherte User-Präferenz hat weiterhin Vorrang.
- App-Layout durch `useHistoryState` gekapselt; `setLayout`-Aufrufer (Mock-Load, Import) bleiben unverändert und sind dadurch automatisch undoable.

### Behoben

- `.dgrep/`, `Sitzplan.zip` und das Top-Level `logo.png` (Duplikat von `public/logo.png`) waren versehentlich in den Index gerutscht — entfernt und in `.gitignore` aufgenommen.

### Bekannte offene Punkte (out of scope für M3, → M4+)

- Drag-Preview mit Live-Kollisions-Feedback (heute snappt das Element zurück, ohne visuellen Hinweis während des Drags).
- Mehrere Layouts pro Klasse (M4).
- CSV-Import für Schülerlisten (M4).

---

## [Released] – Milestone 2: Solver-Qualität & Konfliktanalyse

Branch: `feat/milestone-2` (gemergt nach `main` als PR #14, Merge-Commit `8d7f728`). Alle 7 Slices + 3 ADRs in Produktion, Performance-Budget < 2 s @ 35/30 als Vitest-Test verankert.

### Hinzugefügt

- **Hybrid-Solver**: Greedy-Init (Schüler:innen nach Schwierigkeit sortiert) + Simulated Annealing + 6 Random-Restarts pro Profil. Beste Lösung gewinnt. SA-Cooling-Schedule getunt (T 20→0.5, α 0.92, 50 Iter/Temp) — ~5× schneller pro Pass als M1. Siehe ADR 0003.
- **Seedable RNG** (`src/utils/rng.ts`): Mulberry32-PRNG. `generateSeatingProposals(students, rules, layout, opts?: { seed?: number })` — deterministisch wenn `seed` gegeben, sonst `Math.random`-Fallback (Default für Produktion). Siehe ADR 0005.
- **Konfliktanalyse** als `SeatingProposal.diagnostics` (statt separater Endpoint, siehe ADR 0004): `unplacedStudents[]`, `bottlenecks[]` (frontRow/doorAccess/window mit `required`/`available`), `contradictoryRules[]` (widersprüchliche Hard-Rules wie `beside`+`not_beside`), optionaler `note`-String. Pre-Check vor dem Solver-Lauf + Post-Analyse nach Restart-Loop.
- **Schwierigkeitsgewichtung** (`computeStudentDifficulty`, HEURISTIC_PLAN §6): `hardRules*10 + softRules*3 + specialNeeds*6 + relations*4`. Greedy-Init platziert schwierigste Schüler:innen zuerst; SA-Score nutzt difficulty-weighted Penalty (1 + diff/50) für die SA-Entscheidung; angezeigter Score bleibt un-gewichtet.
- **Verständliche DE-Erklärungen pro `SeatingViolation`** mit Schüler-Namen und konkreter Regel (statt technischer Defaults). `proposal.explanation` ist jetzt eine 3-Zeilen-Zusammenfassung "Ziel / Erreicht / Offen".
- **Hard-Conflict-Banner** im Generator: zeigt "Plan enthält harte Konflikte. Bitte Regeln prüfen." sobald irgendein Vorschlag `valid:false` ist. Token-treues CSS (`var(--danger)`/`var(--danger-light)`).
- **Diagnose-Panel** im Generator: rendert `diagnostics.bottlenecks`, `diagnostics.contradictoryRules`, nicht platzierte Schüler:innen und `diagnostics.note`. Vollständig token-getrieben (`var(--orange)`/`var(--surface-2)`).
- **Dedup-Strategie für Top-3**: alle Restart-Kandidaten (18 = 3 Presets × 6 Restarts) gehen in die Auswahl ein. `selectTop3Distinct` (intern `selectTop3DistinctRaw` auf Lightweight-Records) wählt die 3 strukturell unterschiedlichsten via Hamming-Distanz ≥ 30 % der Schüler:innen. Soft-Reduktion (0.30 → 0.25 → … → 0.0) wenn nicht genug verschiedene Kandidaten; Hinweis in `diagnostics.note`.
- **Performance-Budget-Test**: `generateSeatingProposals` auf `M2_LARGE_STUDENTS`/`M2_LARGE_RULES`/`M2_LARGE_LAYOUT` (35 Schüler:innen, 30 Regeln) muss < 2000 ms abschließen. Aktuell ~800 ms median.
- **Test-Fixtures** `src/test/fixtures/m2-large-class.ts` (35 Schüler:innen, 6×6 Pultraster, mixed Special Needs) und `m2-conflict.ts` (8 Schüler:innen mit Sehschwäche auf 2 Front-Plätzen, widersprüchliches Regelpaar).
- **Tests**: Determinismus auf Large, Dedup-30%-Schwelle auf Large, Sonderbedarfs-Platzierungen (Hörschwäche → vorne, Barrierefreiheit → Tür, Konzentration → fensterarm), Bottleneck-Diagnose, `computeStudentDifficulty`-Mathe, `mulberry32`-Determinismus, Slice-1-Trifecta („alle 3 Profile invalid bei unlösbarem Setup"). Insgesamt 95 Tests in 7 Files.
- **ADR 0003** (`docs/adr/0003-hybrid-solver-greedy-plus-sa.md`), **ADR 0004** (`docs/adr/0004-diagnostics-in-seating-proposal.md`), **ADR 0005** (`docs/adr/0005-deterministic-solver-via-optional-seed.md`).
- **Slash-Commands** `/m2-status` (Slice-Tabelle + Quality-Gates-Snapshot) und `/finish-m2` (Integrations-Checklist + PR-Body-Template).

### Geändert

- `generateSeatingProposals` baut volle `SeatingProposal`-Objekte (inkl. `analyzeSeatingDiagnostics`) nur noch für die 3 ausgewählten Finalisten statt für alle 18 Kandidaten. ~4× schneller auf 35/30.
- `evaluateSeating` nutzt für SA-Entscheidung einen difficulty-weighted Score; öffentlich sichtbarer Score bleibt un-gewichtet.
- Vitest-Test-Discovery auf `src/**/*.{test,spec}.{ts,tsx}` beschränkt — schließt verschachtelte Worktrees (`.claude/worktrees/*/src`) aus, sonst liefen Tests aus parallelen Slice-Worktrees doppelt mit.
- `eslint.config.js` ignoriert `.claude/` (verhindert false-positives aus Slice-Worktrees).

### Behoben

- Solver markiert Vorschläge mit verbleibenden Hard-Violations zuverlässig als `valid:false`, auch wenn alle 3 Profile fehlschlagen.
- UI zeigt prominenten Warnhinweis statt stiller `valid:false` (Lehrkräfte sahen vorher ungültige Pläne ohne Indiz).

### Bekannte offene Punkte (out of scope für M2, → M3+)

- KI-Chat-Befehle für Konfliktauflösung (z. B. "Wenn ich Anna nach hinten setze, was passiert?").
- Drag-&-Drop-Override im Generator mit anschließender Re-Validierung.
- Persistente Solver-Konfiguration (Gewichte als User-Settings).
- Mehrsprachige UI.

---

## [Released] – Milestone 1: MVP-Härtung lokal

Branch: `feat/milestone-1` (gemergt nach `main` am 2026-05-25 als Commit `6cea200`).

### Hinzugefügt

- Versionierter `localStorage`-Container mit Envelope `{ schemaVersion, data }` für Klassen und Raumlayout (`src/utils/storage.ts`). Siehe ADR 0002.
- Migration für Legacy-Daten ohne Schema-Version (v0 → v1).
- Schema-Validierung beim Import (`src/utils/validation.ts`) mit pfadbasierten Fehlermeldungen wie `classes[2].students[5].name: erwartet string, war number`.
- Fehlerbanner im Dashboard bei kaputter Importdatei — bestehender State bleibt unangetastet, bis zu 5 Fehler werden gezeigt, Banner schließbar.
- ID-Wrapper `newId(prefix?)` über `crypto.randomUUID()` (`src/utils/ids.ts`). Alle Entitäts-IDs (Klassen, Schüler:innen, Regeln, Raumelemente, Vorschläge) verwenden ihn.
- `valid: boolean`-Flag auf `SeatingProposal` — Vorschläge mit Hard-Violations werden als ungültig markiert.
- Diagnose-Anzeige im Generator: rotes "UNGÜLTIG"-Badge pro Vorschlag mit Hard-Violations, Top-Level-Diagnose-Panel mit aggregierter Liste der blockierenden Regeln, wenn kein Vorschlag gültig ist.
- Bestätigungsdialog vor Schülerlöschung (`StudentMgmt.tsx`).
- Automatische Regel-Bereinigung beim Schülerlöschen — Regeln mit Bezug auf den gelöschten Schüler werden entfernt.
- GitHub Actions Workflow `.github/workflows/ci.yml` (orientiert an Pflichtenheft §7, auf pnpm umgestellt) — `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`, optional `pnpm test`, mit Concurrency-Cancel.
- ADR 0002 (`docs/adr/0002-storage-schema-versioning.md`).
- Vitest + Testing Library + jsdom-Setup (`vitest.config.ts`, `src/test/setup.ts`).
- 49 Tests in 6 Dateien — Storage-Migration, Import-Validierung, Solver (Hard/Soft, `not_beside`, `front`), Parser-Phrasen, ID-Wrapper, Regel-Cleanup.
- Test-Fixtures `src/test/fixtures/class-small.ts` (4 Schüler, 4 Plätze, regelfrei) und `class-conflict.ts` (strukturell unlösbar, erzwingt `valid:false`).
- Pure-Function `cleanRulesForDeletedStudent` in `src/utils/cleanup.ts` (extrahiert aus `App.tsx` für Testbarkeit, 100 % Coverage).
- `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`-Scripts.
- Projekt-lokale Claude-Code-Konfiguration: 4 Subagent-Definitionen (`slice-implementer`, `slice-tester`, `slice-reviewer`, `doc-syncer`) und 5 Slash-Commands (`/slice`, `/m1-status`, `/merge-slices`, `/finish-m1`, `/lint-baseline`) unter `.claude/`.

### Geändert

- `App.tsx` `useState`-Init lädt jetzt über die Storage-Utility, nicht mehr direkt aus `localStorage`.
- Speicher-`useEffect`s sind durch `useRef`-Gate geschützt — feuern erst nach echter Mutation, nicht beim initialen Mount. Schützt Bestandsdaten vor versehentlichem Überschreiben mit leerem Default.

### Behoben

- `localStorage`-Daten aus zukünftigen App-Versionen werden nicht mehr durch ältere Instanzen still überschrieben.
- Ungültige Import-JSON kann den App-State nicht mehr zerstören.

### Bekannt offen

- ESLint zeigt 9 Probleme (8 Errors, 1 Warning) aus pre-existing Code in `Generator.tsx`, `parser.ts`, `solver.ts`. Kein M1-Regress; CI-Workflow ist aktiv, läuft aber rot bis zur Lint-Bereinigung. Aufgabe für Folge-Slice.
- Paket-Manager-Konvention auf **pnpm** vereinheitlicht (CLAUDE.md, CI, Docs). `package-lock.json` entfernt, `pnpm-lock.yaml` ist Source of Truth.
- Parser-Bug entdeckt (Slice 6): Substring-Matching auf Schülernamen kollidiert mit deutschen Funktionswörtern ("Zorglub neben Anna" matcht den Studenten "Ben"). Test wurde mit kollisionsfreiem Namen umformuliert; Wortgrenzen-Regex im Parser ist eigener Folge-Slice.
- Solver-Coverage 60 % — Special-Needs-Branches (Hörschwäche, Barrierefreiheit, Verhalten, Konzentration) noch ungetestet; nice-to-have.
- Komponenten-Tests (Dashboard, Generator-Print-View, StudentMgmt) bewusst rausgelassen — Slice 6 setzt auf Pure-Function-Tests. Falls Print-View-Test verbindlich wird, eigener Slice.
- Vitest und Tests fehlen noch (Slice 6 in Arbeit).
- Export-Dateiname und -Format weichen vom Pflichtenheft-Ziel (`SitzplanerProjectFile` mit `exportedAt`, `appVersion`) ab. Validierung akzeptiert bereits beide Formen, Export-Pfad bleibt aber unverändert — Folgearbeit.
