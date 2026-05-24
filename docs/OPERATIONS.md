# Operations – Sitzplaner

## 1. Betriebsmodell

Der Sitzplaner wird im MVP als statische Web-App betrieben. Es gibt keinen Serverzustand, keine Datenbank und keine Accounts. Alle produktiven Nutzdaten liegen im Browser der Nutzer:innen und können als JSON exportiert werden.

Das ist technisch schlicht, datenschutzfreundlich und deutlich weniger anfällig als ein halbgarer Login-Zoo mit Datenbankpanik im Hintergrund.

## 2. Betriebsvarianten

| Variante | Beschreibung | Empfehlung |
|---|---|---|
| lokal via Dev Server | `npm run dev` | Entwicklung |
| statischer Build | `npm run build` + `dist/` ausliefern | MVP-Produktion |
| GitHub Pages | statisches Hosting aus `dist/` | einfach |
| Cloudflare Pages/Netlify | automatischer Build aus Git | komfortabel |
| eigener Webserver | Nginx/Apache liefert `dist/` | self-hosted |
| Backend-Betrieb | API + DB | erst spätere Phase |

## 3. Build

```bash
npm ci
npm run lint
npm run build
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

## 4. Deployment statisch

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

## 5. Backup und Restore

### MVP

Backups erfolgen über JSON-Export in der App.

Empfohlener Dateiname:

```text
sitzplaner-export-YYYY-MM-DD.json
```

Nutzerhinweis:

```text
Diese Datei kann personenbezogene Schülerdaten enthalten. Speichere sie geschützt und teile sie nicht unverschlüsselt.
```

### Restore

Ablauf:

1. App öffnen
2. Import auswählen
3. JSON-Datei laden
4. Vorschau/Validierung prüfen
5. Import bestätigen

Wichtig:

- fehlerhafte Imports dürfen vorhandene Daten nicht überschreiben
- bei Schema-Versionen müssen Migrationen laufen

## 6. Monitoring

### MVP

Kein Server-Monitoring nötig, da statische App.

Sinnvolle Checks:

- Build erfolgreich
- Hosting erreichbar
- `index.html` wird ausgeliefert
- Assets laden ohne 404

### Optional später

Bei Backend:

- API Healthcheck
- Datenbankverfügbarkeit
- Backup-Erfolg
- Error Rate
- Login-Fehler
- Speicherverbrauch

## 7. Logging

### MVP-Regel

Keine personenbezogenen Schülerdaten in Logs.

Erlaubt:

```ts
console.error('Import failed: invalid schema');
```

Nicht erlaubt:

```ts
console.error('Import failed for student Max Mustermann', student);
```

## 8. Security Headers

Für statisches Hosting sinnvoll:

| Header | Zweck |
|---|---|
| `X-Content-Type-Options: nosniff` | MIME-Sniffing verhindern |
| `Referrer-Policy: strict-origin-when-cross-origin` | Referrer begrenzen |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking reduzieren |
| `Content-Security-Policy` | später fein definieren |

CSP erst nach Test setzen, damit Vite-/Build-Assets sauber laufen.

## 9. Rollback

Bei statischem Hosting:

1. vorheriges `dist/` wiederherstellen
2. CDN/Cache invalidieren
3. Smoke-Test ausführen

Rollback schützt nicht vor kaputten lokalen Browserdaten. Deshalb sind Storage-Migrationen releasekritisch.

## 10. Release-Betrieb

Vor jedem Release:

- `docs/RELEASE_CHECKLIST.md` abarbeiten
- Smoke-Test ausführen
- Export/Import prüfen
- Druckansicht prüfen
- README/CHANGELOG aktualisieren, falls vorhanden

## 11. Späterer Backend-Betrieb

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

## 12. Betriebsrisiken

| Risiko | MVP-Maßnahme |
|---|---|
| Browserdaten gelöscht | Exporthinweise und Projektdateien |
| fehlerhafte Migration | Tests + Backup-Hinweis vor Update |
| kaputter Build | CI und Release-Checkliste |
| Hosting falsch konfiguriert | statische Server-Beispiele |
| Datenschutzfehler | keine Telemetrie, keine Cloud im MVP |
