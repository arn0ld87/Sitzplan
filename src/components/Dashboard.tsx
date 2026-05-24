import React, { useRef } from 'react';
import {
  Users,
  Layout,
  Sliders,
  Download,
  Upload,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { SchoolClass, ClassroomLayout } from '../types';

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
  const activeClass = classes.find((c) => c.id === activeClassId);

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.classes && data.layout) {
          onImportData(data);
          alert('Daten erfolgreich importiert!');
        } else {
          alert('Ungültiges Dateiformat. Die Datei muss "classes" und "layout" enthalten.');
        }
      } catch (err) {
        alert('Fehler beim Lesen der Datei. Bitte stelle sicher, dass es sich um eine gültige JSON-Datei handelt.');
      }
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
      </div>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Schüler in dieser Klasse</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalStudents}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>({totalRules} aktive Sitzregeln)</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Schüler mit besonderem Bedarf</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{specialNeedsCount}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <Sliders size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sitzplatzkapazität (Frei / Belegt)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {totalSeats} Plätze <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>({totalSeats >= totalStudents ? 'Ausreichend' : 'Zu wenig!'})</span>
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
