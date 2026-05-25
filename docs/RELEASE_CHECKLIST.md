# Release Checklist – Sitzplaner

## 1. Ziel

Diese Checkliste wird vor jedem Release abgearbeitet. Sie verhindert, dass kaputte Web-Builds, defekte Imports, zerstörte Druckansichten oder nicht startende macOS-Bundles veröffentlicht werden. Also das Minimum an Zivilisation im Softwarebetrieb.

## 2. Release-Daten

Vor Release ausfüllen:

```text
Release-Version:
Release-Datum:
Verantwortlich:
Branch/Commit:
Release-Typ: Web / macOS / beide
```

## 3. Vorbereitungen

- [ ] alle geplanten Issues für das Release geprüft
- [ ] offene Blocker geklärt
- [ ] README geprüft
- [ ] `docs/MACOS_APP.md` geprüft, falls macOS betroffen
- [ ] relevante Dokumentation aktualisiert
- [ ] keine echten Schülerdaten in Testdaten oder Screenshots
- [ ] keine lokalen Dateien im Commit

## 4. Technische Checks Web

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

Falls Tests vorhanden:

```bash
pnpm test:run
```

Checkliste Web:

- [ ] `pnpm install --frozen-lockfile` erfolgreich
- [ ] `pnpm lint` erfolgreich
- [ ] `pnpm build` erfolgreich
- [ ] Tests erfolgreich, falls vorhanden
- [ ] keine neuen kritischen Warnings
- [ ] Web-`dist/` wurde korrekt erzeugt

## 5. Technische Checks macOS

Bei Änderungen unter `macos/SitzplanMac` oder bei macOS-Release:

```bash
cd macos/SitzplanMac
swift build
swift run SitzplanMac
./scripts/build-app.sh
open dist/Sitzplaner.app
```

Checkliste macOS:

- [ ] `swift build` erfolgreich
- [ ] `swift run SitzplanMac` startet
- [ ] `./scripts/build-app.sh` erfolgreich
- [ ] `dist/Sitzplaner.app` existiert
- [ ] App-Bundle startet per `open dist/Sitzplaner.app`
- [ ] `Info.plist` plausibel
- [ ] ad-hoc Codesign läuft lokal durch
- [ ] keine echten Schülerdaten in Logs

## 6. Manuelle Smoke-Tests Web

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

## 7. Manuelle Smoke-Tests macOS

- [ ] App startet ohne Crash
- [ ] Fenster/UI erscheint korrekt
- [ ] Klasse kann angelegt oder vorhandener Stand geladen werden
- [ ] lokale Speicherung über Neustart hinweg geprüft
- [ ] Raumlayout bleibt erhalten, falls Funktion vorhanden
- [ ] aktive Klasse bleibt erhalten, falls Funktion vorhanden
- [ ] Export/Import geprüft, sobald vorhanden
- [ ] keine personenbezogenen Daten in Logs

## 8. Datenschutz-Check

- [ ] keine Telemetrie ergänzt
- [ ] keine externen API-Calls mit Schülerdaten
- [ ] keine Schülerdaten in Web-Logs
- [ ] keine Schülerdaten in macOS-Logs
- [ ] Exporthinweis vorhanden
- [ ] keine echten Schülerdaten im Repo
- [ ] macOS-`UserDefaults`-Nutzung ist dokumentiert

## 9. Security-Check

- [ ] Web: kein `dangerouslySetInnerHTML`
- [ ] keine Secrets im Repo
- [ ] Dependencies geprüft
- [ ] Importdaten werden validiert
- [ ] keine unsicheren externen Skripte eingebunden
- [ ] macOS-Bundle enthält keine lokalen Testdaten

Optional Web:

```bash
pnpm audit
```

## 10. Deployment-Check Web

- [ ] statischer Build wurde deployed
- [ ] Hosting liefert `index.html`
- [ ] Assets laden ohne 404
- [ ] Reload auf Unterseiten funktioniert, falls Routing eingeführt wurde
- [ ] HTTPS aktiv, falls öffentlich bereitgestellt

## 11. Distribution-Check macOS

Interner Build:

- [ ] `.app` wurde erzeugt
- [ ] `.app` wurde lokal gestartet
- [ ] ZIP/Artefakt enthält nur notwendige Dateien
- [ ] Ziel-macOS-Version ist dokumentiert

Öffentlicher Build später:

- [ ] Developer-ID-Signing geplant
- [ ] Notarisierung geplant
- [ ] DMG/ZIP-Strategie dokumentiert
- [ ] Update-Strategie dokumentiert

## 12. Rollback-Plan

Vor Release klären:

- [ ] vorheriger Web-Build verfügbar
- [ ] vorheriges macOS-App-Bundle verfügbar, falls macOS-Release
- [ ] Rollback-Pfad bekannt
- [ ] bei Storage-Migration Backup-Hinweis vorhanden
- [ ] bei Fehlern kann vorherige Version wieder ausgeliefert werden

## 13. Release-Notizen

Template:

```markdown
## Sitzplaner vX.Y.Z

### Neu
- ...

### Verbessert
- ...

### Behoben
- ...

### Plattformen
- Web: ...
- macOS: ...

### Hinweise
- Exportdateien können personenbezogene Daten enthalten.
- Die macOS-App speichert lokal über UserDefaults.
```

## 14. Freigabe

Release darf erfolgen, wenn:

- [ ] keine kritischen Fehler offen sind
- [ ] relevante Builds grün sind
- [ ] Smoke-Test bestanden ist
- [ ] Import/Export geprüft ist, falls betroffen
- [ ] Druckansicht geprüft ist, falls Web betroffen
- [ ] macOS-App-Bundle geprüft ist, falls macOS betroffen
- [ ] Datenschutz-Check bestanden ist
