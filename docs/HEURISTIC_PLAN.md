# Heuristic Plan – Sitzplan-Solver

## 1. Ziel

Der Solver soll Sitzpläne erzeugen, die harte Regeln einhalten, weiche Regeln möglichst gut erfüllen und Lehrkräften nachvollziehbar erklären, warum ein Vorschlag gut oder schlecht ist.

Der aktuelle Ansatz ist ein bewertender Greedy-Algorithmus mit mehreren Gewichtungsprofilen. Das ist für MVP sinnvoll. Für größere Klassen und viele Regeln muss die Bewertungslogik aber systematischer werden.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| Seat/Desk | Sitzplatz im Raumlayout |
| Assignment | Zuordnung `deskId -> studentId` |
| Hard Constraint | darf nicht verletzt werden |
| Soft Constraint | darf verletzt werden, senkt Score |
| Score | Qualitätswert eines Vorschlags |
| Violation | Regelverletzung mit Erklärung |

## 3. Solver-Ziele nach Priorität

1. Alle Schüler:innen eindeutig platzieren.
2. Keine harten Regeln verletzen.
3. Förderbedarfe bevorzugt passend platzieren.
4. Weiche Regeln möglichst gut erfüllen.
5. Varianten erzeugen, die sich sinnvoll unterscheiden.
6. Erklärungen liefern, die eine Lehrkraft versteht.

## 4. Bewertungsdimensionen

| Dimension | Beispiele | Gewicht |
|---|---|---:|
| harte Konflikte | `not_beside`, zwei Verhalten-Schüler nebeneinander | sehr hoch/blockierend |
| Förderbedarf | Seh-/Hörschwäche vorne, Barrierefreiheit nahe Tür | hoch |
| pädagogische Platzierung | Konzentration weg von Tür/Fenster | mittel |
| soziale Regeln | Freund:innen zusammen, Konflikte auseinander | mittel |
| Layoutqualität | freie Sicht, Randplätze, Abstände | niedrig/mittel |

## 5. Profile

### 5.1 Ausgewogen

- balanciert alle Regeltypen
- Default für normale Nutzung
- keine extreme Gewichtung

### 5.2 Fokus

- harte Regeln und Förderbedarfe dominieren
- soziale Wünsche werden schwächer gewichtet
- geeignet für schwierige Klassen

### 5.3 Freundschaft

- weiche Zusammen-Sitzen-Regeln werden stärker belohnt
- harte Trennregeln bleiben verbindlich
- geeignet für ruhige Gruppen oder Einstiegssituationen

## 6. Algorithmus-Plan

### MVP: Greedy + Random Restarts

Ablauf:

1. Eingaben validieren.
2. Sitzplätze extrahieren.
3. harte Positionsbedarfe vorplatzieren.
4. Schüler:innen nach Schwierigkeit sortieren:
   - viele Regeln zuerst
   - Förderbedarfe zuerst
   - Konfliktpersonen zuerst
5. für jede Person beste freie Plätze bewerten.
6. beste Kandidaten zufällig leicht variieren.
7. mehrere Durchläufe ausführen.
8. beste Ergebnisse deduplizieren.
9. drei Profile zurückgeben.

### Schwierigkeitsscore pro Schüler:in

```ts
studentDifficulty =
  hardRuleCount * 10 +
  softRuleCount * 3 +
  specialNeedsCount * 6 +
  relationCount * 4;
```

### Kandidatenbewertung

```ts
candidateScore =
  baseScore
  - hardPenalty
  - softPenalty
  + profileBonus
  + layoutBonus
  - crowdingPenalty;
```

## 7. Konfliktanalyse

Wenn kein guter Plan entsteht, soll die App nicht nur scheitern, sondern Hinweise geben. Ja, Fehlermeldungen mit Inhalt. Ein seltenes Konzept.

Beispiele:

- zu wenige Sitzplätze
- Person A soll neben B sitzen, aber gleichzeitig weit weg von B
- Person A darf nicht neben B sitzen, aber nur zwei Plätze sind frei
- mehrere Schüler:innen mit Sehschwäche, aber zu wenige Frontplätze
- mehrere Barrierefreiheitsbedarfe, aber nur ein türnaher Platz

## 8. Hard-Constraint-Regeln

Hard-Regeln sollen in der Endbewertung nicht nur hohe Minuspunkte geben, sondern gültige Vorschläge blockieren.

Empfehlung:

```ts
if (hardViolations.length > 0) {
  proposal.valid = false;
}
```

Danach kann die UI unterscheiden:

- gültiger Vorschlag
- ungültiger Diagnosevorschlag
- kein Vorschlag möglich

## 9. Soft-Constraint-Erklärungen

Jede verletzte Soft-Regel braucht:

- betroffene Person
- Regeltyp
- Zielperson oder Zielelement
- kurze Begründung
- optional Verbesserungsvorschlag

Beispiel:

```json
{
  "type": "soft",
  "description": "Lisa sitzt nahe am Fenster, obwohl Konzentrationsbedarf hinterlegt ist.",
  "suggestion": "Lisa näher zur Raummitte oder nach vorn setzen."
}
```

## 10. Testfälle

### Basistests

- 4 Schüler:innen, 4 Plätze, keine Regeln → vollständige Zuordnung
- mehr Schüler:innen als Plätze → Fehler
- mehr Plätze als Schüler:innen → freie Plätze bleiben leer

### Hard-Constraint-Tests

- A darf nicht neben B → niemals benachbart
- A muss vorne sitzen → nur Frontbereich gültig
- Barrierefreiheit → türnah oder Rand

### Soft-Constraint-Tests

- A soll neben B → Score höher, wenn erfüllt
- Konzentrationsbedarf nicht am Fenster → Score niedriger bei Fensternähe
- Freundschaftsprofil bevorzugt `beside`

### Konflikttests

- A neben B hard + A weit weg von B hard → Konfliktmeldung
- drei Sehschwäche-Schüler:innen, aber ein Frontplatz → Konfliktmeldung

## 11. Qualitätsmetriken

| Metrik | Ziel |
|---|---|
| Vollständigkeit | alle Schüler:innen platziert, wenn Plätze reichen |
| Hard-Compliance | 0 harte Regelverletzungen in gültigen Vorschlägen |
| Erklärbarkeit | jede Verletzung hat verständliche Beschreibung |
| Stabilität | gleiche Eingabe liefert reproduzierbare Top-Ergebnisse optional per Seed |
| Laufzeit | unter 2 Sekunden bei 35 Schüler:innen |

## 12. Spätere Ausbaustufe

Wenn Greedy nicht reicht:

- Simulated Annealing
- Constraint Programming mit OR-Tools WASM/Backend
- Integer Linear Programming im Backend
- Seeded Randomness für reproduzierbare Vorschläge

Empfehlung: Erst Greedy + Random Restarts + Konfliktanalyse. OR-Tools erst, wenn echte Nutzerfälle daran scheitern.
