# macOS App – SitzplanMac

## 1. Zweck

Der Ordner `macos/SitzplanMac` enthält die native macOS-Version des Sitzplaners. Sie ergänzt die Web-App um eine lokale Desktop-Variante für macOS.

Wichtig: Die macOS-App ist kein Backend und keine Cloud-Version. Sie bleibt lokal.

## 2. Aktueller Stand

Bekannte Eigenschaften:

- SwiftPM-Projekt
- SwiftUI-App
- Mindestplattform macOS 13
- ausführbares Produkt `SitzplanMac`
- lokale Speicherung über `UserDefaults`
- kein Backend
- keine Authentifizierung
- keine Cloud-Synchronisierung
- App-Bundle wird über `scripts/build-app.sh` gebaut

## 3. Verzeichnis

```text
macos/SitzplanMac/
  Package.swift
  README.md
  scripts/
    build-app.sh
```

Weitere Swift-Quelldateien liegen im SwiftPM-Projektkontext und müssen bei Änderungen gesondert geprüft werden.

## 4. Build

```bash
cd macos/SitzplanMac
swift build
```

## 5. Run

```bash
cd macos/SitzplanMac
swift run SitzplanMac
```

## 6. App-Bundle erstellen

```bash
cd macos/SitzplanMac
./scripts/build-app.sh
open dist/Sitzplaner.app
```

Das Build-Script:

- baut per `swift build --disable-index-store`
- erstellt `dist/Sitzplaner.app`
- kopiert das Binary nach `Contents/MacOS/Sitzplaner`
- schreibt eine `Info.plist`
- setzt `LSMinimumSystemVersion` auf `13.0`
- signiert ad-hoc mit `codesign --sign -`

## 7. Architekturbezug

Die macOS-App ist eine zweite lokale Oberfläche neben der Web-App.

```text
Sitzplaner Produkt
├─ Web-App
│  ├─ React
│  ├─ TypeScript
│  ├─ Vite
│  └─ localStorage
└─ macOS-App
   ├─ SwiftPM
   ├─ SwiftUI
   └─ UserDefaults
```

## 8. Gemeinsame Produktregeln

Diese Regeln gelten für Web-App und macOS-App:

- lokal-first
- keine Schülerdaten an externe Dienste
- keine Telemetrie im MVP
- Export/Import muss personenbezogene Daten schützen
- Solver-Logik muss nachvollziehbar bleiben
- harte Regeln dürfen nicht still verletzt werden

## 9. Wichtige Abweichungen Web vs. macOS

| Bereich | Web-App | macOS-App |
|---|---|---|
| UI-Technik | React/TypeScript | SwiftUI |
| Build | `pnpm build` | `swift build` |
| Start | Browser/Vite | `swift run SitzplanMac` |
| Persistenz | `localStorage` | `UserDefaults` |
| Bundle | `dist/` | `dist/Sitzplaner.app` |
| Distribution | statisches Hosting | App-Bundle / spätere notarized App |

## 10. QA-Anforderungen macOS

Vor macOS-Release prüfen:

- `swift build` erfolgreich
- `swift run SitzplanMac` startet
- `./scripts/build-app.sh` erzeugt `dist/Sitzplaner.app`
- App öffnet ohne Crash
- lokale Daten bleiben nach Neustart erhalten
- keine echten Schülerdaten in Logs
- App-Bundle enthält korrekte `Info.plist`
- ad-hoc Signatur funktioniert lokal

## 11. Release-Anforderungen macOS

Für interne Builds reicht zunächst ad-hoc Signing.

Für öffentliche Verteilung später erforderlich:

- Developer ID Zertifikat
- Hardened Runtime prüfen
- Notarisierung über Apple Notary Service
- signiertes DMG oder ZIP
- Update-Strategie

Das ist für MVP nicht Pflicht. Bitte nicht vorzeitig einen Apple-Release-Prozess bauen, nur weil irgendwo ein `.app`-Bundle existiert. So entstehen Wartungsmonster.

## 12. Backlog macOS

| Priorität | Aufgabe |
|---|---|
| P0 | Build- und Run-Anleitung aktuell halten |
| P0 | macOS-App in Release-Checkliste aufnehmen |
| P1 | Datenmodell mit Web-App abgleichen |
| P1 | Export-/Import-Kompatibilität zur Web-App klären |
| P1 | Swift-Tests für Kernlogik prüfen |
| P2 | App-Icon und Bundle-Metadaten sauber pflegen |
| P2 | notarisierten Release vorbereiten |
| P3 | Auto-Update prüfen, z. B. Sparkle |

## 13. Offene Architekturfrage

Die zentrale Frage ist, ob Web-App und macOS-App langfristig dieselbe Solver-Logik teilen sollen.

Optionen:

| Option | Vorteil | Nachteil |
|---|---|---|
| getrennte Solver | native Umsetzung je Plattform | Drift-Risiko |
| gemeinsames JSON-Testset | einfache Qualitätskontrolle | Logik bleibt doppelt |
| Solver als WASM/Core-Modul | echte Wiederverwendung | höherer Aufwand |
| Backend-Solver | einheitliche Logik | widerspricht MVP lokal-first |

Empfehlung für jetzt:

- gemeinsames JSON-Testset für Eingaben/Erwartungen
- Web- und macOS-Solver getrennt halten
- Drift über Tests erkennen
- keine Backend-Abhängigkeit einführen
