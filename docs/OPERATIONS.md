# Operations – Sitzplaner

## 1. Betriebsmodell

Der Sitzplaner wird im MVP als lokale Web-App und native macOS-App betrieben. Es gibt keinen Serverzustand, keine Datenbank und keine Accounts. Produktive Nutzdaten liegen lokal im Browser der Nutzer:innen oder in der lokalen macOS-App und können perspektivisch als JSON exportiert werden.

Das ist technisch schlicht, datenschutzfreundlich und deutlich weniger anfällig als ein halbgarer Login-Zoo mit Datenbankpanik im Hintergrund.

## 2. Betriebsvarianten

| Variante | Beschreibung | Empfehlung |
|---|---|---|
| Web lokal via Dev Server | `pnpm dev` | Entwicklung Web |
| Web statischer Build | `pnpm build` + `dist/` ausliefern | MVP-Produktion Web |
| GitHub Pages | statisches Hosting aus `dist/` | einfach |
| Cloudflare Pages/Netlify | automatischer Build aus Git | komfortabel |
| eigener Webserver | Nginx/Apache liefert `dist/` | self-hosted Web |
| macOS lokal | `swift run SitzplanMac` | Entwicklung macOS |
| macOS App-Bundle | `./scripts/build-app.sh` → `dist/Sitzplaner.app` | interne Desktop-Builds |
| Backend-Betrieb | API + DB | erst spätere Phase |

## 3. Build Web

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

Build-Ergebnis:

```text
dist/
```

Nur `dist/` wird ausgeliefert. Nicht ausliefern:

- `node_modules/`
- `.env*`
- `.git/`
- lokale Projektdateien
- Testdaten mit echten Schülerdaten

## 4. Build macOS

```bash
cd macos/SitzplanMac
swift build
swift run SitzplanMac
./scripts/build-app.sh
```

Build-Ergebnis:

```text
macos/SitzplanMac/dist/Sitzplaner.app
```

Das App-Bundle wird aktuell ad-hoc signiert. Das reicht für lokale/interne Builds. Für öffentliche Distribution braucht es später Developer-ID-Signing und Notarisierung.

Nicht veröffentlichen:

- `.build/`
- lokale Testdaten
- echte Schülerdaten
- temporäre Logs

## 5. Deployment Web statisch

### Nginx-Beispiel

```nginx
server {
    listen 80;
    server_name sitzplan.example.local;

    root /var/www/sitzplan/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
}
```

### Apache-Beispiel

```apache
<VirtualHost *:80>
    ServerName sitzplan.example.local
    DocumentRoot /var/www/sitzplan/dist

    <Directory /var/www/sitzplan/dist>
        Options -Indexes
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>

    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set X-Frame-Options "SAMEORIGIN"
</VirtualHost>
```

## 6. macOS Distribution

### Intern

```bash
cd macos/SitzplanMac
./scripts/build-app.sh
open dist/Sitzplaner.app
```

Interne Weitergabe:

- `.app` als ZIP packen
- Version im Bundle prüfen
- Start auf Zielsystem prüfen
- Nutzerhinweis zu lokaler Datenspeicherung beilegen

### Öffentlich später

Erforderlich:

- Apple Developer Account
- Developer-ID-Zertifikat
- Hardened Runtime prüfen
- Notarisierung
- signiertes DMG oder ZIP
- dokumentierter Update-Prozess

Nicht Teil des MVP. Der MVP soll Sitzpläne lösen, nicht das Apple-Distributionslabyrinth nachbauen.

## 7. Backup und Restore

### MVP Web

Backups erfolgen über JSON-Export in der App.

Empfohlener Dateiname:

```text
sitzplaner-export-YYYY-MM-DD.json
```

Nutzerhinweis:

```text
Diese Datei kann personenbezogene Schülerdaten enthalten. Speichere sie geschützt und teile sie nicht unverschlüsselt.
```

### MVP macOS

Die macOS-App speichert lokal über `UserDefaults`. Bis ein kompatibler Export/Import umgesetzt ist, ist das Backup-Konzept eingeschränkt.

Ziel:

- gleicher JSON-Export wie Web
- gleiche Schema-Version
- Import/Export zwischen Web und macOS möglich

### Restore

Ablauf Zielzustand:

1. App öffnen
2. Import auswählen
3. JSON-Datei laden
4. Vorschau/Validierung prüfen
5. Import bestätigen

Wichtig:

- fehlerhafte Imports dürfen vorhandene Daten nicht überschreiben
- bei Schema-Versionen müssen Migrationen laufen
- Web und macOS müssen dasselbe Schema verstehen

## 8. Monitoring

### MVP Web

Kein Server-Monitoring nötig, da statische App.

Sinnvolle Checks:

- Build erfolgreich
- Hosting erreichbar
- `index.html` wird ausgeliefert
- Assets laden ohne 404

### MVP macOS

Kein Server-Monitoring.

Sinnvolle Checks:

- `swift build` erfolgreich
- App-Bundle erzeugbar
- App startet ohne Crash
- lokale Speicherung funktioniert

### Optional später

Bei Backend:

- API Healthcheck
- Datenbankverfügbarkeit
- Backup-Erfolg
- Error Rate
- Login-Fehler
- Speicherverbrauch

## 9. Logging

### MVP-Regel

Keine personenbezogenen Schülerdaten in Logs.

Erlaubt Web:

```ts
console.error('Import failed: invalid schema');
```

Nicht erlaubt Web:

```ts
console.error('Import failed for student Max Mustermann', student);
```

Nicht erlaubt macOS:

```swift
print("Import failed for student \(student.name)")
```

## 10. Security Headers Web

Für statisches Hosting sinnvoll:

| Header | Zweck |
|---|---|
| `X-Content-Type-Options: nosniff` | MIME-Sniffing verhindern |
| `Referrer-Policy: strict-origin-when-cross-origin` | Referrer begrenzen |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking reduzieren |
| `Content-Security-Policy` | später fein definieren |

CSP erst nach Test setzen, damit Vite-/Build-Assets sauber laufen.

## 11. Rollback

### Web

1. vorheriges `dist/` wiederherstellen
2. CDN/Cache invalidieren
3. Smoke-Test ausführen

### macOS

1. vorheriges `.app`/ZIP bereitstellen
2. Nutzerhinweis zu Datenkompatibilität geben
3. Start und lokale Daten prüfen

Rollback schützt nicht vor kaputten lokalen Daten. Deshalb sind Storage-Migrationen releasekritisch.

## 12. Release-Betrieb

Vor jedem Release:

- `docs/RELEASE_CHECKLIST.md` abarbeiten
- Web-Smoke-Test ausführen
- macOS-Smoke-Test ausführen, falls macOS betroffen
- Export/Import prüfen
- Druckansicht prüfen
- README/CHANGELOG aktualisieren, falls vorhanden

## 13. Späterer Backend-Betrieb

Erst nach ADR.

Mindestanforderungen:

- Docker Compose
- PostgreSQL
- automatisierte Backups
- Restore-Test
- HTTPS
- OIDC oder sichere Session-Auth
- Rollenmodell
- Mandantentrennung
- Migrationsstrategie

## 14. Betriebsrisiken

| Risiko | MVP-Maßnahme |
|---|---|
| Browserdaten gelöscht | Exporthinweise und Projektdateien |
| macOS-UserDefaults nicht portabel | kompatiblen Export/Import priorisieren |
| fehlerhafte Migration | Tests + Backup-Hinweis vor Update |
| kaputter Web-Build | CI und Release-Checkliste |
| kaputter macOS-Build | SwiftPM-Build und App-Bundle-Check |
| Hosting falsch konfiguriert | statische Server-Beispiele |
| Datenschutzfehler | keine Telemetrie, keine Cloud im MVP |
