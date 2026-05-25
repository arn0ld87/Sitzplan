import React, { useRef, useState } from 'react';
import {
  Users,
  Layout,
  Sliders,
  Download,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import type { SchoolClass, ClassroomLayout } from '../types';
import { validateImportPayload, type ValidationError } from '../utils/validation';

interface DashboardProps {
  classes: SchoolClass[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  layout: ClassroomLayout;
  onLoadExampleClass: () => void;
  onImportData: (data: { classes: SchoolClass[]; layout: ClassroomLayout }) => void;
  onExportData: () => void;
  onCreateClass: (name: string) => void;
  onDeleteClass: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  activeClassId,
  setActiveClassId,
  layout,
  onLoadExampleClass,
  onImportData,
  onExportData,
  onCreateClass,
  onDeleteClass
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<ValidationError[] | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const activeClass = classes.find((c) => c.id === activeClassId);

  const resetImportFeedback = () => {
    setParseError(null);
    setImportErrors(null);
    setImportSuccess(null);
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected after an error.
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      resetImportFeedback();
      const text = (e.target?.result as string) ?? '';

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unbekannter Fehler';
        setParseError(`Ungültige JSON-Datei: ${message}`);
        return;
      }

      const result = validateImportPayload(parsed);
      if (!result.ok) {
        setImportErrors(result.errors);
        return;
      }

      onImportData(result.data);
      setImportSuccess('Import erfolgreich übernommen.');
    };
    reader.readAsText(file);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('className') as string;
    if (name.trim()) {
      onCreateClass(name.trim());
      e.currentTarget.reset();
    }
  };

  // Stats Calculations
  const totalStudents = activeClass ? activeClass.students.length : 0;
  const specialNeedsCount = activeClass
    ? activeClass.students.filter((s) => s.specialNeeds.length > 0).length
    : 0;
  const totalSeats = layout.elements.filter((el) => el.type === 'desk').length;
  const totalRules = activeClass ? activeClass.rules.length : 0;

  return (
    <div className="dashboard-view">
      <div className="card">
        <h2 className="card-title">
          <Layout size={24} />
          Willkommen beim Sitzplan-Macher!
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Dieses Tool hilft Lehrkräften, Klassenzimmer visuell zu gestalten, pädagogische und physische Sitzregeln festzulegen und in Sekundenschnelle konfliktfreie Sitzpläne zu generieren.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onLoadExampleClass}>
            Beispielklasse (8b) laden
          </button>
          <button className="btn btn-secondary" onClick={onExportData}>
            <Download size={18} />
            Daten exportieren (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            Daten importieren (JSON)
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>

        {parseError && (
          <div
            role="alert"
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              border: '1px solid var(--danger, #d33)',
              background: 'var(--danger-light, rgba(220, 38, 38, 0.08))',
              color: 'var(--ink, inherit)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertCircle size={20} style={{ color: 'var(--danger, #d33)', flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Import abgebrochen</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{parseError}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Bestehende Daten bleiben unverändert.
              </div>
            </div>
            <button
              type="button"
              aria-label="Meldung schließen"
              onClick={() => setParseError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.15rem'
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {importErrors && importErrors.length > 0 && (
          <div
            role="alert"
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              border: '1px solid var(--danger, #d33)',
              background: 'var(--danger-light, rgba(220, 38, 38, 0.08))',
              color: 'var(--ink, inherit)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertCircle size={20} style={{ color: 'var(--danger, #d33)', flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                Import abgebrochen — {importErrors.length}{' '}
                {importErrors.length === 1 ? 'Problem' : 'Probleme'}
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '1.1rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)'
              }}>
                {importErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx} style={{ marginBottom: '0.2rem' }}>
                    {err.path}: erwartet {err.expected}, war {err.actual}
                  </li>
                ))}
              </ul>
              {importErrors.length > 5 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  … und {importErrors.length - 5} weitere.
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Bestehende Daten bleiben unverändert.
              </div>
            </div>
            <button
              type="button"
              aria-label="Meldung schließen"
              onClick={() => setImportErrors(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.15rem'
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {importSuccess && (
          <div
            role="status"
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              border: '1px solid var(--success, #2a8)',
              background: 'var(--success-light, rgba(34, 197, 94, 0.08))',
              color: 'var(--ink, inherit)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <CheckCircle2 size={20} style={{ color: 'var(--success, #2a8)', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.9rem' }}>{importSuccess}</div>
            <button
              type="button"
              aria-label="Meldung schließen"
              onClick={() => setImportSuccess(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.15rem'
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-icon">
            <Users size={18} />
          </div>
          <div>
            <div className="stat-card-label">Schüler in dieser Klasse</div>
            <div className="stat-card-number">{totalStudents}</div>
            <div className="stat-card-sub">({totalRules} aktive Sitzregeln)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="stat-card-label">Förderbedarf</div>
            <div className="stat-card-number">{specialNeedsCount}</div>
            <div className="stat-card-sub">besondere Bedarfe</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <Sliders size={18} />
          </div>
          <div>
            <div className="stat-card-label">Sitzplatzkapazität</div>
            <div className="stat-card-number">
              {totalSeats} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-muted)' }}>Plätze</span>
            </div>
            <div className="stat-card-sub" style={{ color: totalSeats >= totalStudents ? 'var(--color-primary)' : 'var(--color-error)' }}>
              {totalSeats >= totalStudents ? 'Ausreichend freie Sitze' : 'Zu wenig Sitzplätze!'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Class Selection & Management */}
        <div className="card">
          <h3 className="card-title">Klassenverwaltung</h3>
          
          <div className="form-group">
            <label className="form-label">Aktive Klasse auswählen</label>
            <select
              className="form-select"
              value={activeClassId}
              onChange={(e) => setActiveClassId(e.target.value)}
            >
              <option value="">-- Bitte Klasse wählen --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.students.length} Schüler)
                </option>
              ))}
            </select>
          </div>

          {classes.length > 0 && activeClassId && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Klassen-Aktionen</h4>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm(`Möchtest du die Klasse "${activeClass?.name}" wirklich unwiderruflich löschen?`)) {
                    onDeleteClass(activeClassId);
                  }
                }}
              >
                <Trash2 size={16} />
                Klasse löschen
              </button>
            </div>
          )}
        </div>

        {/* Add Class Form */}
        <div className="card">
          <h3 className="card-title">Neue Klasse anlegen</h3>
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="className">Klassenbezeichnung</label>
              <input
                className="form-input"
                id="className"
                name="className"
                type="text"
                placeholder="z. B. Klasse 9a"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit">
              <Plus size={18} />
              Klasse erstellen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
