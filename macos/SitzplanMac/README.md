# SitzplanMac

Native macOS-Version der Sitzplaner-App als SwiftPM/SwiftUI-Projekt.

## Build

```bash
swift build
```

## Run

```bash
swift run SitzplanMac
```

## App-Bundle erstellen

```bash
./scripts/build-app.sh
open dist/Sitzplaner.app
```

Die App bleibt lokal und speichert Klassen, Raumlayout und aktive Klasse in `UserDefaults`.
Es gibt kein Backend, keine Authentifizierung und keine Cloud-Synchronisierung.
