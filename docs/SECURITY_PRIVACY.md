# Security & Privacy – Sitzplaner

## 1. Grundsatz

Der Sitzplaner verarbeitet potenziell personenbezogene Daten von Schüler:innen. Deshalb gilt: lokal-first, keine Telemetrie, keine externen APIs und keine Cloud-Funktion ohne ausdrückliche Architekturentscheidung.

Schülerdaten sind nicht einfach Testdaten. Auch wenn Softwareprojekte diese Wahrheit gern behandeln wie einen optionalen Cookie-Hinweis.

## 2. Datenarten

| Datenart | Beispiel | Schutzbedarf |
|---|---|---:|
| Name | Max Mustermann | mittel |
| Klasse | 8b | mittel |
| Förderbedarf | Sehschwäche, Verhalten | hoch |
| Sitzregeln | A nicht neben B | mittel/hoch |
| Notizen später | pädagogische Hinweise | hoch |

## 3. Datenschutzanforderungen MVP

- keine automatische Netzwerkübertragung
- keine Analytics
- keine Crash-Reports mit Schülerdaten
- keine externen KI-APIs für Schülerdaten
- Exportdateien klar als personenbezogene Daten behandeln
- Import/Export bleibt manuell

## 4. Bedrohungsmodell

| Risiko | Beschreibung | Maßnahme |
|---|---|---|
| Datenverlust | Browserdaten werden gelöscht | Export/Backup, Warnhinweise |
| Fremdzugriff am Gerät | Browserprofil offen | keine Cloud-Abhilfe im MVP, Nutzerhinweis |
| XSS über Namen | Schülername enthält HTML/Script | React escaping nutzen, kein `dangerouslySetInnerHTML` |
| kaputter Import | falsche JSON-Datei überschreibt Daten | Validierung vor State-Update |
| ungewollte Cloud | spätere API sendet Schülerdaten | ADR + Opt-in + Datenschutztext |

## 5. Sicherheitsregeln für Code

- kein `dangerouslySetInnerHTML`
- keine eval-artigen Funktionen
- keine externen Skripte für Kernfunktion
- keine Schülerdaten in `console.log`
- keine unvalidierten Imports übernehmen
- keine Secrets im Repo
- Dependencies minimal halten

## 6. Import-Sicherheit

Import muss:

1. JSON parsen
2. Schema prüfen
3. Version prüfen
4. Daten normalisieren
5. Vorschau oder Bestätigung anzeigen
6. erst dann speichern

Fehlerfall:

- bestehende Daten bleiben unverändert
- Fehlermeldung nennt Ursache
- keine Teilimporte ohne Hinweis

## 7. Export-Sicherheit

Exportdatei soll enthalten:

- `schemaVersion`
- `exportedAt`
- App-Version
- Daten

Dateiname:

```text
sitzplaner-export-YYYY-MM-DD.json
```

Hinweis in UI:

```text
Diese Exportdatei kann personenbezogene Schülerdaten enthalten. Bewahre sie geschützt auf.
```

## 8. Backend nur mit Zusatzkonzept

Vor Backend-Einführung erforderlich:

- Rollenmodell
- Auth-Konzept
- Session-/Token-Konzept
- Backup-Konzept
- Löschkonzept
- Transportverschlüsselung
- Datenschutztext
- Mandantentrennung

## 9. OWASP-orientierte Checkliste

| Thema | MVP-Maßnahme |
|---|---|
| Injection | keine HTML-Injektion, Import validieren |
| Broken Access Control | ohne Backend nicht relevant, später Rollenmodell |
| Sensitive Data Exposure | lokal-first, keine Telemetrie |
| Security Misconfiguration | statische App minimal halten |
| Vulnerable Components | npm audit prüfen, Dependencies klein halten |

## 10. Release-Sicherheitscheck

Vor Release prüfen:

- keine neuen externen API-Calls
- keine Debug-Ausgaben mit Schülerdaten
- Importvalidierung aktiv
- Exporthinweis vorhanden
- `npm audit` geprüft
- Build enthält keine `.env` oder lokalen Dateien
