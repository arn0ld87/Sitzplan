import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, ShieldAlert, Edit2, X, Check } from 'lucide-react';
import type { Student, SpecialNeed, SchoolClass } from '../types';

interface StudentMgmtProps {
  activeClass: SchoolClass | undefined;
  onAddStudent: (name: string, specialNeeds: SpecialNeed[]) => void;
  onUpdateStudent: (id: string, name: string, specialNeeds: SpecialNeed[]) => void;
  onDeleteStudent: (id: string) => void;
}

const SPECIAL_NEEDS_LIST: { value: SpecialNeed; label: string; desc: string }[] = [
  { value: 'Sehschwäche', label: 'Sehschwäche', desc: 'Sollte ganz vorne an der Tafel sitzen.' },
  { value: 'Hörschwäche', label: 'Hörschwäche', desc: 'Sollte vorne / mittig platziert werden.' },
  { value: 'Konzentrationsbedarf', label: 'Konzentrationsbedarf', desc: 'Abseits von Fenstern / Türen.' },
  { value: 'Verhalten', label: 'Verhaltensauffälligkeit', desc: 'Darf nicht neben anderen unruhigen Schülern sitzen.' },
  { value: 'Barrierefreiheit', label: 'Barrierefreiheit (Rollstuhl)', desc: 'Rollstuhlgerechter Platz nahe der Tür.' }
];

export const StudentMgmt: React.FC<StudentMgmtProps> = ({
  activeClass,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent
}) => {
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<SpecialNeed[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNeeds, setEditNeeds] = useState<SpecialNeed[]>([]);

  if (!activeClass) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <ShieldAlert size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
        <h3>Keine Klasse ausgewählt</h3>
        <p style={{ color: 'var(--text-muted)' }}>Bitte wähle im Dashboard erst eine Klasse aus oder erstelle eine neue Klasse.</p>
      </div>
    );
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim()) {
      onAddStudent(newStudentName.trim(), selectedNeeds);
      setNewStudentName('');
      setSelectedNeeds([]);
    }
  };

  const handleNeedToggle = (need: SpecialNeed) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter((n) => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  const handleEditNeedToggle = (need: SpecialNeed) => {
    if (editNeeds.includes(need)) {
      setEditNeeds(editNeeds.filter((n) => n !== need));
    } else {
      setEditNeeds([...editNeeds, need]);
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditName(student.name);
    setEditNeeds(student.specialNeeds);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateStudent(id, editName.trim(), editNeeds);
      setEditingStudentId(null);
    }
  };

  const getBadgeClass = (need: SpecialNeed) => {
    switch (need) {
      case 'Sehschwäche':
      case 'Hörschwäche':
        return 'badge-primary';
      case 'Konzentrationsbedarf':
        return 'badge-accent';
      case 'Verhalten':
        return 'badge-danger';
      case 'Barrierefreiheit':
        return 'badge-success';
      default:
        return 'badge-primary';
    }
  };

  return (
    <div className="student-mgmt-view">
      <div className="grid-2">
        {/* Student List */}
        <div className="card" style={{ flex: 1.5 }}>
          <h3 className="card-title">
            Schülerliste ({activeClass.students.length} Schüler)
          </h3>
          
          {activeClass.students.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              Noch keine Schüler in dieser Klasse. Nutze das rechte Formular zum Hinzufügen!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Besonderer Förderbedarf / Tags</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {activeClass.students.map((student) => {
                    const isEditing = editingStudentId === student.id;
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 550 }}>
                          {isEditing ? (
                            <input
                              className="form-input"
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ width: '180px' }}
                            />
                          ) : (
                            student.name
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {SPECIAL_NEEDS_LIST.map((n) => {
                                const active = editNeeds.includes(n.value);
                                return (
                                  <button
                                    key={n.value}
                                    type="button"
                                    onClick={() => handleEditNeedToggle(n.value)}
                                    style={{
                                      border: 'none',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      backgroundColor: active ? 'var(--primary)' : 'var(--bg-app)',
                                      color: active ? 'white' : 'var(--text-muted)',
                                      transition: 'var(--transition)'
                                    }}
                                  >
                                    {n.value}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {student.specialNeeds.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Keine Bedarfe</span>
                              ) : (
                                student.specialNeeds.map((need) => (
                                  <span key={need} className={`badge ${getBadgeClass(need)}`}>
                                    {need}
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => saveEdit(student.id)}
                                style={{ padding: '0.3rem', color: 'var(--success)' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingStudentId(null)}
                                style={{ padding: '0.3rem', color: 'var(--danger)' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startEdit(student)}
                                style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  if (confirm(`Soll ${student.name} wirklich gelöscht werden?`)) {
                                    onDeleteStudent(student.id);
                                  }
                                }}
                                style={{ padding: '0.4rem', color: 'var(--danger)' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Student Panel */}
        <div className="card" style={{ flex: 1 }}>
          <h3 className="card-title">
            <UserPlus size={20} />
            Neuen Schüler anlegen
          </h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="studentName">Vorname und Nachname</label>
              <input
                className="form-input"
                id="studentName"
                type="text"
                placeholder="z. B. Max Mustermann"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Förderbedarf / Besondere Anforderungen</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {SPECIAL_NEEDS_LIST.map((n) => {
                  const active = selectedNeeds.includes(n.value);
                  return (
                    <label
                      key={n.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        backgroundColor: active ? 'var(--primary-glow)' : 'transparent',
                        borderColor: active ? 'var(--primary)' : 'var(--border)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleNeedToggle(n.value)}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{n.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Plus size={18} />
              Schüler hinzufügen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
