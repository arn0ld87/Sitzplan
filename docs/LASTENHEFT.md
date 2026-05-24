# Lastenheft – Sitzplaner

## 1. Ausgangssituation

Lehrkräfte erstellen Sitzpläne häufig manuell. Dabei müssen pädagogische, organisatorische und räumliche Anforderungen gleichzeitig beachtet werden: Konflikte zwischen Schüler:innen, Förderbedarfe, Sicht zur Tafel, Nähe zur Tür, Gruppenarbeit, Druckbarkeit und schnelle Anpassungen.

Der bestehende Sitzplaner löst dieses Problem bereits als lokale React-App mit Klassenverwaltung, Schülerdaten, Sitzregeln, Raumeditor und Sitzplan-Generator.

## 2. Ziel

Die Anwendung soll zu einer verlässlichen, produktionsfähigen App ausgebaut werden, mit der Lehrkräfte Sitzpläne schnell, nachvollziehbar und datenschutzfreundlich erstellen, sichern, ändern und drucken können.

## 3. Zielgruppen

| Rolle | Beschreibung | Hauptnutzen |
|---|---|---|
| Lehrkraft | erstellt und pflegt Sitzpläne | Zeit sparen, Regeln einhalten |
| Klassenleitung | verwaltet mehrere Klassen | Übersicht, Wiederverwendung |
| Vertretungslehrkraft | nutzt fertige Pläne | schnelle Orientierung |
| Schule/Admin | stellt App bereit | Datenschutz, Standardisierung |

## 4. Muss-Anforderungen

### 4.1 Klassenverwaltung

- Nutzer:innen können mehrere Klassen anlegen.
- Jede Klasse enthält Schüler:innen und Sitzregeln.
- Klassen können gelöscht werden.
- Beim Löschen einer Klasse dürfen andere Klassen nicht verändert werden.

### 4.2 Schülerverwaltung

- Schüler:innen können angelegt, bearbeitet und gelöscht werden.
- Mindestens folgende Daten werden unterstützt:
  - Name
  - Förder-/Sonderbedarfe
  - optionale Notizen in späterer Ausbaustufe
- Beim Löschen eines Schülers/einer Schülerin müssen zugehörige Regeln entfernt oder sauber invalidiert werden.

### 4.3 Sitzregeln

- Regeln können als harte oder weiche Regeln definiert werden.
- Harte Regeln dürfen von gültigen Vorschlägen nicht verletzt werden.
- Weiche Regeln dürfen verletzt werden, müssen aber den Score verschlechtern.
- Unterstützte Regeltypen:
  - neben bestimmter Person
  - nicht neben bestimmter Person
  - nahe bei bestimmter Person
  - weit weg von bestimmter Person
  - vorne
  - hinten
  - am Rand
  - nahe Tür
  - nahe Tafel
  - nicht am Fenster

### 4.4 Raumeditor

- Räume können visuell aufgebaut werden.
- Unterstützte Elemente:
  - Sitzplatz/Tisch
  - Tafel
  - Tür
  - Fenster
  - Schrank/Möbel
- Elemente müssen positionierbar sein.
- Sitzplätze müssen eindeutig identifizierbar sein.

### 4.5 Sitzplan-Generator

- Die App erzeugt mehrere Vorschläge.
- Vorschläge enthalten:
  - Zuordnung von Schüler:innen zu Sitzplätzen
  - Score
  - Regelverletzungen
  - menschenlesbare Erklärung
- Wenn kein sinnvoller Vorschlag gefunden wird, muss die App erklären, welche Regeln problematisch sind.

### 4.6 Persistenz und Datensicherung

- Daten bleiben lokal erhalten.
- Export als JSON muss möglich sein.
- Import muss validiert werden.
- Datenformat muss versioniert werden.
- Fehlerhafte Importdateien dürfen bestehende Daten nicht überschreiben.

### 4.7 Druck und Weitergabe

- Sitzpläne müssen sauber druckbar sein.
- Druckansicht enthält Sitzplan und Legende.
- Druck soll für DIN A4 quer optimiert sein.

### 4.8 Datenschutz

- Ohne explizite Entscheidung dürfen keine Schülerdaten an Server gesendet werden.
- Lokal-first ist Pflicht.
- Cloud-/Backend-Funktionen dürfen nur optional eingeführt werden.

## 5. Soll-Anforderungen

- mehrere Raumlayouts pro Klasse
- Sitzplan-Historie pro Klasse
- Undo/Redo im Raumeditor
- Konfliktanalyse vor Generierung
- CSV-Import für Schülerlisten
- PDF-Export ohne Browser-Dialog
- bessere Tablet-Bedienung
- einfache Barrierefreiheit: Tastaturbedienung, Kontraste, Labels

## 6. Kann-Anforderungen

- optionales Backend mit Sync
- Benutzerkonten
- Rollenmodell
- Schul-/Mandantenverwaltung
- OIDC/SSO
- echte KI-Unterstützung für Regelanlage
- Vorlagenbibliothek für Raumlayouts

## 7. Nicht-Ziele

- kein Notenbuch
- kein Stundenplan
- keine Anwesenheitserfassung
- keine Schüler-Accounts
- keine verpflichtende Cloud
- keine automatische Verarbeitung sensibler Diagnosedaten außerhalb lokaler Nutzung

## 8. Qualitätsanforderungen

| Bereich | Anforderung |
|---|---|
| Zuverlässigkeit | keine Datenverluste bei normaler Nutzung |
| Verständlichkeit | Vorschläge müssen erklärbar sein |
| Performance | Klassen bis 35 Schüler:innen flüssig nutzbar |
| Datenschutz | lokal nutzbar ohne Netzwerkübertragung |
| Wartbarkeit | typisierte Datenmodelle, Tests für Kernlogik |
| Bedienbarkeit | klare Workflows: Klasse → Schüler → Regeln → Raum → Generator |

## 9. Abnahmekriterien MVP

Der MVP gilt als abgenommen, wenn:

- eine Beispielklasse geladen werden kann
- mindestens 25 Schüler:innen verwaltet werden können
- mindestens 10 Regeln gemischt aus hard/soft funktionieren
- ein Raumlayout mit mindestens 25 Sitzplätzen erzeugt werden kann
- drei Vorschläge generiert werden
- harte Regelverstöße nicht als gültig verkauft werden
- Export/Import funktioniert
- Druckansicht brauchbar ist
- Build, Lint und Kernlogiktests erfolgreich laufen
