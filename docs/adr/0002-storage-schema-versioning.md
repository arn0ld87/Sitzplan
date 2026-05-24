# ADR 0002 – Storage Schema Versioning

## Status

Akzeptiert

## Datum

2026-05-25

## Kontext

Vor Milestone 1 lagen Klassen, Schüler:innen und Raumlayouts direkt unter den `localStorage`-Keys `sitzplaner_classes` und `sitzplaner_layout` — als bare JSON-Arrays bzw. -Objekte ohne Versionsfeld. Das Datenmodell wird sich aber fast sicher weiterentwickeln (mehrere Layouts pro Klasse, gespeicherte Planversionen, kompatible Web-/macOS-Exports). Ohne Versionsmarker kann eine spätere Code-Änderung Bestandsdaten zerstören, ohne dass das jemand sofort merkt.

Verschärft wird das Problem dadurch, dass die App von Lehrkräften lokal genutzt wird und es keinen Server gibt, der "die richtige Version" festlegt. Die im Browser liegenden Daten überleben oft Monate, Browser-Updates und gelegentliches Reset-vergessen.

## Entscheidung

Alle persistenten Daten in `localStorage` werden ab Milestone 1 in einen versionierten Envelope verpackt:

```ts
type StorageEnvelope<T> = {
  schemaVersion: number;
  data: T;
};
```

`CURRENT_SCHEMA_VERSION = 1` bezeichnet das Format, in dem `data` direkt der zuvor verwendete bare Wert ist (Array bei Klassen, Objekt bei Layout). Es findet **keine** Daten-Umstrukturierung statt — nur die Hülle wird ergänzt.

### Lese-Pfad

1. Wert aus `localStorage` lesen.
2. Wenn JSON die Envelope-Form hat (`{ schemaVersion, data }`):
   - `schemaVersion > CURRENT_SCHEMA_VERSION` → ablehnen, leeres Default zurückgeben, **bestehenden Eintrag nicht überschreiben**.
   - Bekannte Version → migrieren falls nötig, dann `data` verwenden.
3. Wenn JSON KEINE Envelope-Form hat (Legacy v0): den ganzen Wert als `data` interpretieren und beim nächsten Schreiben in v1-Envelope packen.
4. Inhaltliche Validierung (Struktur der `data`) erfolgt durch Type-Guards. Schlägt sie fehl, gilt der Wert als kaputt; leeres Default zurückgeben, **bestehenden Eintrag nicht überschreiben**.

### Schreib-Pfad

Jeder Save wickelt den Wert in einen frischen v1-Envelope. Erst nach echter User-Mutation; nicht beim initialen Mount (per `useRef`-Gate). Das verhindert, dass ein „mit leerem Default geladen"-Zustand den bestehenden Eintrag im Storage löscht.

### Geltungsbereich

- Gilt für `sitzplaner_classes` und `sitzplaner_layout`.
- Gilt **nicht** für `sitzplaner_theme` — kosmetisch, kein Datenverlustrisiko.
- Export-Dateien folgen langfristig demselben Prinzip mit zusätzlichen Metadaten (`exportedAt`, `appVersion`), siehe PFLICHTENHEFT §3.1. Die Validierungslogik akzeptiert bereits beide Formen (mit/ohne Envelope).

## Konsequenzen

### Positiv

- Spätere Schema-Änderungen können sauber migriert werden, statt Bestandsdaten still zu zerstören.
- Daten aus zukünftigen App-Versionen werden erkannt und nicht durch eine ältere App-Instanz überschrieben.
- Klare Trennung von Envelope-Validierung (in `storage.ts`) und Inhalts-Validierung (in `validation.ts`).
- Der Refactor war minimal-invasiv: `App.tsx` wurde durch Utility-Aufrufe ersetzt, kein State-Management-Umbau.

### Negativ / Kosten

- Storage-Footprint wächst um ein Feld pro Top-Level-Wert (~20 Bytes, vernachlässigbar).
- Beim ersten Save nach Migration wird die alte v0-Form überschrieben — vor diesem Punkt liegt v0 noch parallel im Storage. Das ist gewollt und unkritisch.

### Folgearbeit

- Wenn das Datenmodell ändert (z. B. `layouts: ClassroomLayout[]` statt `layout: ClassroomLayout`, siehe PFLICHTENHEFT §3.1), wird `CURRENT_SCHEMA_VERSION` auf 2 erhöht und eine Migration `v1 → v2` in `storage.ts` ergänzt. Diese ADR bleibt gültig — das Versionierungs-Prinzip skaliert mit.
- Beim Einführen mehrerer Layouts pro Klasse (Backlog P2) wird der gleiche Envelope-Mechanismus für die neue Datenstruktur verwendet.

## Referenzen

- `src/utils/storage.ts` — Implementierung des Envelopes und der Migration.
- `src/utils/validation.ts` — Inhaltliche Validierung für Importe.
- PFLICHTENHEFT §3.1 / §3.2 — Anforderungen an versionierten Speichercontainer und Migration.
- ARCHITECTURE.md §9 — empfohlener Persistenz-Aufbau.
- BACKLOG.md P0 "Storage versionieren".
