# Release Checklist – Sitzplaner

## 1. Ziel

Diese Checkliste wird vor jedem Release abgearbeitet. Sie verhindert, dass kaputte Builds, defekte Imports oder zerstörte Druckansichten veröffentlicht werden. Also das Minimum an Zivilisation im Softwarebetrieb.

## 2. Release-Daten

Vor Release ausfüllen:

```text
Release-Version:
Release-Datum:
Verantwortlich:
Branch/Commit:
```

## 3. Vorbereitungen

- [ ] alle geplanten Issues für das Release geprüft
- [ ] offene Blocker geklärt
- [ ] README geprüft
- [ ] relevante Dokumentation aktualisiert
- [ ] keine echten Schülerdaten in Testdaten oder Screenshots
- [ ] keine lokalen Dateien im Commit

## 4. Technische Checks

```bash
npm ci
npm run lint
npm run build
```

Falls Tests vorhanden:

```bash
npm run test:run
```

Checkliste:

- [ ] `npm ci` erfolgreich
- [ ] `npm run lint` erfolgreich
- [ ] `npm run build` erfolgreich
- [ ] Tests erfolgreich, falls vorhanden
- [ ] keine neuen kritischen Warnings
- [ ] `dist/` wurde korrekt erzeugt

## 5. Manuelle Smoke-Tests

### Start

- [ ] App öffnet ohne leeren Bildschirm
- [ ] keine kritischen Console-Fehler
- [ ] Light Mode funktioniert
- [ ] Dark Mode funktioniert

### Klassen

- [ ] Beispielklasse laden
- [ ] neue Klasse anlegen
- [ ] Klasse wechseln
- [ ] Klasse löschen mit Bestätigung

### Schüler:innen

- [ ] Schüler:in anlegen
- [ ] Schüler:in bearbeiten
- [ ] Förderbedarf setzen
- [ ] Schüler:in löschen
- [ ] abhängige Regeln werden sauber entfernt

### Regeln

- [ ] harte Regel anlegen
- [ ] weiche Regel anlegen
- [ ] relationale Regel mit Zielperson anlegen
- [ ] Positionsregel anlegen
- [ ] Regel löschen

### Raumeditor

- [ ] Tisch/Sitzplatz hinzufügen
- [ ] Tafel hinzufügen
- [ ] Tür/Fenster hinzufügen
- [ ] Element verschieben
- [ ] Element löschen
- [ ] Layout bleibt nach Reload erhalten

### Generator

- [ ] Vorschläge generieren
- [ ] drei Profile sichtbar
- [ ] Score sichtbar
- [ ] Regelverletzungen sichtbar
- [ ] Warnung bei zu wenigen Sitzplätzen sichtbar

### Druck

- [ ] Druckvorschau öffnen
- [ ] Sitzplan ist lesbar
- [ ] Legende ist lesbar
- [ ] DIN A4 quer wirkt brauchbar
- [ ] keine Bedien-UI im Druck sichtbar

### Import/Export

- [ ] Export erzeugt JSON-Datei
- [ ] Export enthält Schema-/Metadaten, sobald implementiert
- [ ] Import gültiger Datei funktioniert
- [ ] Import ungültiger Datei zerstört keine Daten
- [ ] Nutzerhinweis zu personenbezogenen Daten sichtbar, sobald implementiert

## 6. Datenschutz-Check

- [ ] keine Telemetrie ergänzt
- [ ] keine externen API-Calls mit Schülerdaten
- [ ] keine Schülerdaten in Logs
- [ ] Exporthinweis vorhanden
- [ ] keine echten Schülerdaten im Repo

## 7. Security-Check

- [ ] kein `dangerouslySetInnerHTML`
- [ ] keine Secrets im Repo
- [ ] Dependencies geprüft
- [ ] Importdaten werden validiert
- [ ] keine unsicheren externen Skripte eingebunden

Optional:

```bash
npm audit
```

## 8. Deployment-Check

- [ ] statischer Build wurde deployed
- [ ] Hosting liefert `index.html`
- [ ] Assets laden ohne 404
- [ ] Reload auf Unterseiten funktioniert, falls Routing eingeführt wurde
- [ ] HTTPS aktiv, falls öffentlich bereitgestellt

## 9. Rollback-Plan

Vor Release klären:

- [ ] vorheriger Build verfügbar
- [ ] Rollback-Pfad bekannt
- [ ] bei Storage-Migration Backup-Hinweis vorhanden
- [ ] bei Fehlern kann vorherige Version wieder ausgeliefert werden

## 10. Release-Notizen

Template:

```markdown
## Sitzplaner vX.Y.Z

### Neu
- ...

### Verbessert
- ...

### Behoben
- ...

### Hinweise
- Exportdateien können personenbezogene Daten enthalten.
```

## 11. Freigabe

Release darf erfolgen, wenn:

- [ ] keine kritischen Fehler offen sind
- [ ] Build grün ist
- [ ] Smoke-Test bestanden ist
- [ ] Import/Export geprüft ist
- [ ] Druckansicht geprüft ist
- [ ] Datenschutz-Check bestanden ist
