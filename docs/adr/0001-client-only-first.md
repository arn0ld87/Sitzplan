# ADR 0001 – Client-only-first

## Status

Akzeptiert

## Datum

2026-05-25

## Kontext

Der Sitzplaner verarbeitet potenziell personenbezogene Schülerdaten wie Namen, Klassenzugehörigkeit, Förderbedarfe und Sitzregeln. Der aktuelle Stand ist eine React-/TypeScript-/Vite-App, die vollständig im Browser läuft und Daten in `localStorage` speichert.

Es gibt mehrere mögliche Zielarchitekturen:

1. lokale Browser-App ohne Backend
2. self-hosted Backend mit Datenbank
3. Cloud-/SaaS-App mit Accounts und Sync

Ein Backend wirkt auf den ersten Blick professioneller, bringt aber sofort Datenschutz, Betrieb, Authentifizierung, Backups, Mandantentrennung und Haftungsfragen mit. Also ungefähr alles, was aus einer kleinen App einen Verwaltungsakt mit Ladebalken macht.

## Entscheidung

Der Sitzplaner bleibt für MVP und Produktreife-Phase zunächst **client-only**.

Das bedeutet:

- keine Accounts
- kein Backend
- keine Datenbank
- keine Telemetrie
- keine automatische Cloud-Synchronisation
- keine externen KI-APIs für Schülerdaten
- Persistenz lokal im Browser
- Backup/Restore über JSON-Export und Import

## Begründung

### Vorteile

- sehr einfache Bereitstellung als statische Web-App
- geringe Betriebskosten
- keine Serverwartung
- weniger Datenschutzrisiko
- keine Mandanten- oder Rollenlogik nötig
- App ist sofort nutzbar
- Nutzer:innen behalten Kontrolle über Daten

### Nachteile

- kein automatischer Geräte-Sync
- Browserdaten können verloren gehen
- Backups müssen manuell exportiert werden
- keine zentrale Administration
- keine gemeinsame Bearbeitung

Die Nachteile sind für den MVP akzeptabel. Datenverlust wird über klare Export-/Backup-Funktionen, Storage-Versionierung und Warnhinweise reduziert.

## Konsequenzen

### Technisch

- Build bleibt statisch auslieferbar
- Storage-Migrationen werden wichtig
- Import/Export wird Release-kritisch
- Solver und UI bleiben ohne Serverabhängigkeit testbar
- keine Backend-spezifischen Abhängigkeiten im MVP

### Produktseitig

- Zielgruppe ist zuerst die einzelne Lehrkraft
- Schulen/Admins werden später betrachtet
- Sync und Accounts werden nicht versprochen
- Datenschutzkommunikation ist einfacher und ehrlicher

### Sicherheit

- keine Schülerdaten verlassen den Browser durch App-Funktionalität
- Exportdateien müssen als personenbezogene Dateien behandelt werden
- kaputte Imports dürfen lokale Daten nicht beschädigen

## Alternativen

### Self-hosted Backend sofort

Verworfen für MVP.

Grund:

- zu hoher Betriebsaufwand
- Auth und Datenschutz müssten sofort sauber gelöst werden
- Kernprodukt ist noch nicht stabil genug

### SaaS/Cloud sofort

Verworfen für MVP.

Grund:

- maximaler Datenschutz- und Betriebsaufwand
- für frühe Produktvalidierung unnötig
- Nutzervertrauen bei Schülerdaten schwerer zu gewinnen

### Desktop-App

Nicht priorisiert.

Grund:

- Web-App ist bereits vorhanden
- statischer Betrieb reicht
- Desktop-Packaging kann später geprüft werden

## Folgeentscheidungen

Spätere ADRs:

- ADR 0002 – Storage-Schema-Versionierung
- ADR 0003 – Backend-Entscheidung
- ADR 0004 – Sync- und Konfliktstrategie
- ADR 0005 – Authentifizierung und Rollenmodell

## Review-Kriterium

Diese Entscheidung wird neu bewertet, wenn mindestens eine der folgenden Bedingungen erfüllt ist:

- echte Nutzer:innen fordern Sync über mehrere Geräte
- Schule/Admin verlangt zentrale Verwaltung
- Export/Import reicht praktisch nicht mehr aus
- kollaborative Bearbeitung wird Kernanforderung
- Backend wird für Solver-Leistung oder PDF-Generierung zwingend nötig
