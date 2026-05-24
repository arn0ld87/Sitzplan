## Zusammenfassung

Was ändert dieser PR?

## Art der Änderung

- [ ] Bugfix
- [ ] Feature
- [ ] Refactoring
- [ ] Dokumentation
- [ ] Tests
- [ ] CI/CD
- [ ] Security / Privacy

## Betroffener Bereich

- [ ] Web: Dashboard / Klassen
- [ ] Web: Schülerverwaltung
- [ ] Web: Regeln
- [ ] Web: Raumeditor
- [ ] Web: Generator / Solver
- [ ] Web: Import / Export
- [ ] Web: Druckansicht
- [ ] Web: Storage / Migration
- [ ] macOS: SwiftUI-App
- [ ] macOS: UserDefaults / Persistenz
- [ ] macOS: App-Bundle / Signing
- [ ] Dokumentation
- [ ] Build / Tooling

## Checks Web

- [ ] `npm run lint` erfolgreich, falls Web betroffen
- [ ] `npm run build` erfolgreich, falls Web betroffen
- [ ] Tests erfolgreich, falls vorhanden
- [ ] manuell im Browser geprüft, falls UI betroffen
- [ ] Druckansicht geprüft, falls UI/Generator betroffen
- [ ] Import/Export geprüft, falls Storage betroffen

## Checks macOS

Bei Änderungen unter `macos/SitzplanMac`:

- [ ] `cd macos/SitzplanMac && swift build` erfolgreich
- [ ] `swift run SitzplanMac` startet lokal
- [ ] `./scripts/build-app.sh` erzeugt `dist/Sitzplaner.app`, falls Bundle/Release betroffen
- [ ] `open dist/Sitzplaner.app` geprüft, falls Bundle/Release betroffen
- [ ] lokale Speicherung über Neustart geprüft, falls Persistenz betroffen

## Datenschutz / Sicherheit

- [ ] keine echten Schülerdaten im PR
- [ ] keine neuen externen API-Calls mit Schülerdaten
- [ ] keine Schülerdaten in Web-Logs
- [ ] keine Schülerdaten in macOS-Logs
- [ ] Web: kein `dangerouslySetInnerHTML`
- [ ] Importdaten werden validiert, falls Import betroffen
- [ ] macOS-Bundle enthält keine lokalen Testdaten

## Screenshots / Nachweise

Falls UI betroffen ist, Screenshots oder kurze Beschreibung ergänzen.

## Verknüpfte Issues

Closes #

## Hinweise für Review

Worauf soll besonders geachtet werden?
