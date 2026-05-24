# User Stories – Sitzplaner

## 1. Rollen

| Rolle | Beschreibung |
|---|---|
| Lehrkraft | erstellt und pflegt Sitzpläne |
| Klassenleitung | verwaltet mehrere Klassen und Räume |
| Vertretungslehrkraft | nutzt fertige Pläne zur Orientierung |
| Admin/Schule | stellt App bereit und achtet auf Datenschutz |
| Entwickler:in | erweitert App stabil und nachvollziehbar |

## 2. Epic: Klassen verwalten

### US-001 – Klasse anlegen

Als Lehrkraft möchte ich eine neue Klasse anlegen, damit ich Schüler:innen und Regeln getrennt verwalten kann.

Akzeptanzkriterien:

- [ ] Klassenname ist Pflicht
- [ ] neue Klasse erscheint im Dashboard
- [ ] neue Klasse wird aktive Klasse
- [ ] Klasse bleibt nach Reload erhalten

### US-002 – Klasse löschen

Als Lehrkraft möchte ich eine Klasse löschen können, damit alte oder falsche Daten entfernt werden können.

Akzeptanzkriterien:

- [ ] Löschung erfordert Bestätigung
- [ ] andere Klassen bleiben erhalten
- [ ] aktive Klasse wird sinnvoll neu gesetzt

## 3. Epic: Schüler:innen verwalten

### US-010 – Schüler:in anlegen

Als Lehrkraft möchte ich Schüler:innen mit Namen und Förderbedarfen anlegen, damit der Sitzplan pädagogische Anforderungen berücksichtigen kann.

Akzeptanzkriterien:

- [ ] Name ist Pflicht
- [ ] Name wird getrimmt
- [ ] Förderbedarfe können mehrfach gewählt werden
- [ ] Datensatz bleibt nach Reload erhalten

### US-011 – Schüler:in bearbeiten

Als Lehrkraft möchte ich Schülerdaten bearbeiten, damit Änderungen während des Schuljahres abgebildet werden können.

Akzeptanzkriterien:

- [ ] Name kann geändert werden
- [ ] Förderbedarfe können geändert werden
- [ ] Regeln bleiben mit der Schüler-ID verknüpft

### US-012 – Schüler:in löschen

Als Lehrkraft möchte ich Schüler:innen löschen, damit Abgänge oder Fehleingaben entfernt werden.

Akzeptanzkriterien:

- [ ] Löschung entfernt die Person aus der Klasse
- [ ] Regeln mit dieser Person werden entfernt oder invalidiert
- [ ] keine kaputten Regelreferenzen bleiben übrig

## 4. Epic: Regeln verwalten

### US-020 – Harte Trennregel anlegen

Als Lehrkraft möchte ich festlegen, dass zwei Schüler:innen nicht nebeneinander sitzen dürfen, damit Konflikte vermieden werden.

Akzeptanzkriterien:

- [ ] Regeltyp `not_beside` ist auswählbar
- [ ] Zielperson ist Pflicht
- [ ] Regel kann als `hard` gespeichert werden
- [ ] gültige Vorschläge verletzen diese Regel nicht

### US-021 – Weiche Wunschregel anlegen

Als Lehrkraft möchte ich festlegen, dass zwei Schüler:innen möglichst zusammensitzen, damit soziale oder pädagogische Wünsche berücksichtigt werden.

Akzeptanzkriterien:

- [ ] Regeltyp `beside` ist auswählbar
- [ ] Regel kann als `soft` gespeichert werden
- [ ] Verletzung senkt Score, blockiert aber nicht zwingend

### US-022 – Positionsregel anlegen

Als Lehrkraft möchte ich festlegen, dass eine Person vorne, hinten, am Rand oder nahe der Tür sitzen soll.

Akzeptanzkriterien:

- [ ] Positionsregeln benötigen keine Zielperson
- [ ] ungültige Kombinationen werden verhindert
- [ ] Regel erscheint verständlich in der Liste

## 5. Epic: Raumlayout verwalten

### US-030 – Sitzplätze platzieren

Als Lehrkraft möchte ich Sitzplätze im Raum platzieren, damit der Plan den echten Klassenraum abbildet.

Akzeptanzkriterien:

- [ ] Sitzplätze können hinzugefügt werden
- [ ] Sitzplätze können verschoben werden
- [ ] Sitzplätze haben eindeutige IDs
- [ ] Layout bleibt nach Reload erhalten

### US-031 – Raumelemente platzieren

Als Lehrkraft möchte ich Tafel, Tür, Fenster und Möbel platzieren, damit Regeln wie „nahe Tafel“ oder „nicht am Fenster“ funktionieren.

Akzeptanzkriterien:

- [ ] Tafel kann platziert werden
- [ ] Tür kann platziert werden
- [ ] Fenster können platziert werden
- [ ] Solver kann diese Elemente auswerten

## 6. Epic: Sitzplan generieren

### US-040 – Vorschläge generieren

Als Lehrkraft möchte ich mehrere Sitzplanvorschläge erhalten, damit ich nicht manuell alle Kombinationen ausprobieren muss.

Akzeptanzkriterien:

- [ ] mindestens ein Vorschlag wird erzeugt, wenn Eingaben gültig sind
- [ ] drei Profile werden unterstützt: ausgewogen, Fokus, Freundschaft
- [ ] jeder Vorschlag enthält Score und Erklärung
- [ ] Vorschläge enthalten keine doppelten Schülerzuordnungen

### US-041 – Konflikte verstehen

Als Lehrkraft möchte ich wissen, warum kein gültiger Sitzplan erzeugt werden kann, damit ich Regeln gezielt ändern kann.

Akzeptanzkriterien:

- [ ] zu wenige Sitzplätze werden gemeldet
- [ ] widersprüchliche Regeln werden benannt
- [ ] Förderbedarfsengpässe werden erklärt
- [ ] Meldung ist für Nicht-Techniker:innen verständlich

## 7. Epic: Export, Import und Backup

### US-050 – Projekt exportieren

Als Lehrkraft möchte ich meine Daten exportieren, damit ich Backups erstellen oder Geräte wechseln kann.

Akzeptanzkriterien:

- [ ] Export erzeugt JSON-Datei
- [ ] Datei enthält Schema-Version
- [ ] Datei enthält Exportdatum
- [ ] UI weist auf personenbezogene Daten hin

### US-051 – Projekt importieren

Als Lehrkraft möchte ich eine Exportdatei importieren, damit ich Daten wiederherstellen kann.

Akzeptanzkriterien:

- [ ] Datei wird validiert
- [ ] ungültige Datei überschreibt nichts
- [ ] Fehler werden verständlich angezeigt
- [ ] gültige Datei stellt Klassen und Layouts wieder her

## 8. Epic: Druck und Weitergabe

### US-060 – Sitzplan drucken

Als Lehrkraft möchte ich den Sitzplan drucken, damit er im Klassenraum oder für Vertretungen genutzt werden kann.

Akzeptanzkriterien:

- [ ] Druckansicht enthält Sitzplan
- [ ] Druckansicht enthält Legende
- [ ] DIN A4 quer ist lesbar
- [ ] Bedienoberfläche wird im Druck ausgeblendet

## 9. Epic: Datenschutz und Sicherheit

### US-070 – Lokal ohne Account nutzen

Als Lehrkraft möchte ich die App ohne Account nutzen, damit keine Schülerdaten unnötig an Server übertragen werden.

Akzeptanzkriterien:

- [ ] App funktioniert ohne Login
- [ ] App funktioniert ohne Backend
- [ ] keine Telemetrie im MVP
- [ ] keine externen KI-Calls mit Schülerdaten

### US-071 – Import sicher behandeln

Als Nutzer:in möchte ich, dass kaputte Importdateien meine vorhandenen Daten nicht zerstören.

Akzeptanzkriterien:

- [ ] Validierung läuft vor Speicherung
- [ ] bestehender State bleibt bei Fehlern erhalten
- [ ] Fehlerursache wird angezeigt

## 10. Epic: Entwicklung und Wartung

### US-080 – Qualität vor Merge prüfen

Als Entwickler:in möchte ich automatische Checks, damit defekte Änderungen nicht versehentlich auf `main` landen.

Akzeptanzkriterien:

- [ ] CI führt Lint aus
- [ ] CI führt Build aus
- [ ] später CI führt Tests aus
- [ ] PR-Template fordert Smoke-Test-Angaben
