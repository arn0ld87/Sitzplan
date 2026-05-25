import React, { useState } from 'react';
import { Plus, Trash2, Sliders, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { Rule, RuleType, SchoolClass } from '../types';

interface RuleMgmtProps {
  activeClass: SchoolClass | undefined;
  onAddRule: (rule: Omit<Rule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
}

const RULE_TYPES_LABELS: { value: RuleType; label: string; isRelational: boolean }[] = [
  { value: 'beside', label: 'darf neben ... sitzen', isRelational: true },
  { value: 'not_beside', label: 'darf NICHT neben ... sitzen', isRelational: true },
  { value: 'near', label: 'sollte nahe bei ... sitzen', isRelational: true },
  { value: 'far', label: 'sollte weit weg von ... sitzen', isRelational: true },
  { value: 'front', label: 'sollte vorne sitzen', isRelational: false },
  { value: 'back', label: 'sollte hinten sitzen', isRelational: false },
  { value: 'edge', label: 'sollte am Rand sitzen', isRelational: false },
  { value: 'near_door', label: 'sollte nahe der Tür sitzen', isRelational: false },
  { value: 'near_board', label: 'sollte nahe der Tafel sitzen', isRelational: false },
  { value: 'not_window', label: 'sollte nicht am Fenster sitzen', isRelational: false }
];

export const RuleMgmt: React.FC<RuleMgmtProps> = ({
  activeClass,
  onAddRule,
  onDeleteRule
}) => {
  const [studentId, setStudentId] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('beside');
  const [targetId, setTargetId] = useState('');
  const [strictness, setStrictness] = useState<'hard' | 'soft'>('soft');

  if (!activeClass) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <ShieldAlert size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
        <h3>Keine Klasse ausgewählt</h3>
        <p style={{ color: 'var(--text-muted)' }}>Bitte wähle im Dashboard erst eine Klasse aus oder erstelle eine neue Klasse.</p>
      </div>
    );
  }

  const selectedRuleTypeObj = RULE_TYPES_LABELS.find((r) => r.value === ruleType);
  const isRelational = selectedRuleTypeObj?.isRelational || false;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    if (isRelational && !targetId) {
      alert('Bitte wähle einen Zielschüler aus.');
      return;
    }

    if (isRelational && studentId === targetId) {
      alert('Ein Schüler kann keine Beziehung zu sich selbst haben.');
      return;
    }

    onAddRule({
      studentId,
      type: ruleType,
      targetId: isRelational ? targetId : undefined,
      strictness
    });

    // Reset Form partially
    setTargetId('');
  };

  const getStudentName = (id: string) => {
    return activeClass.students.find((s) => s.id === id)?.name || id;
  };

  const getRuleDescription = (rule: Rule) => {
    const sName = getStudentName(rule.studentId);
    const typeLabel = RULE_TYPES_LABELS.find((r) => r.value === rule.type)?.label || rule.type;
    
    if (rule.targetId) {
      const tName = getStudentName(rule.targetId);
      const cleanLabel = typeLabel.replace('...', `**${tName}**`);
      return `**${sName}** ${cleanLabel}`;
    }
    
    return `**${sName}** ${typeLabel}`;
  };

  return (
    <div className="rule-mgmt-view">
      <div className="grid-2">
        {/* Rules List */}
        <div className="card" style={{ flex: 1.5 }}>
          <h3 className="card-title">
            <Sliders size={20} />
            Definierte Sitzregeln ({activeClass.rules.length})
          </h3>

          {activeClass.rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <AlertTriangle size={36} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem auto' }} />
              <p>Aktuell sind keine individuellen Sitzregeln definiert.</p>
              <p style={{ fontSize: '0.85rem' }}>Verwende das rechte Formular, um Regeln wie "A darf nicht neben B sitzen" festzulegen.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeClass.rules.map((rule) => (
                <div key={rule.id} className="rule-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span
                      className={`rule-strictness-tag ${
                        rule.strictness === 'hard' ? 'rule-strictness-hard' : 'rule-strictness-soft'
                      }`}
                    >
                      {rule.strictness === 'hard' ? 'HARD' : 'SOFT'}
                    </span>
                    <span
                      style={{ fontSize: '0.95rem' }}
                      dangerouslySetInnerHTML={{ __html: getRuleDescription(rule).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  </div>
                  <button
                    className="rule-delete-btn"
                    onClick={() => onDeleteRule(rule.id)}
                    aria-label="Regel löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Rule Form */}
        <div className="card" style={{ flex: 1 }}>
          <h3 className="card-title">
            <Plus size={20} />
            Sitzregel hinzufügen
          </h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="sourceStudent">Betroffener Schüler</label>
              <select
                className="form-select"
                id="sourceStudent"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                <option value="">-- Schüler wählen --</option>
                {activeClass.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ruleTypeSelect">Regel / Bedingung</label>
              <select
                className="form-select"
                id="ruleTypeSelect"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
              >
                {RULE_TYPES_LABELS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {isRelational && (
              <div className="form-group" style={{ animation: 'fadeIn 0.25s' }}>
                <label className="form-label" htmlFor="targetStudent">Beziehungspartner (Schüler B)</label>
                <select
                  className="form-select"
                  id="targetStudent"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                >
                  <option value="">-- Mitschüler wählen --</option>
                  {activeClass.students
                    .filter((s) => s.id !== studentId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Priorität / Verbindlichkeit</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: strictness === 'soft' ? 'var(--primary-glow)' : 'transparent',
                    borderColor: strictness === 'soft' ? 'var(--primary)' : 'var(--border)',
                    fontWeight: 600,
                    transition: 'var(--transition)'
                  }}
                >
                  <input
                    type="radio"
                    name="strictness"
                    checked={strictness === 'soft'}
                    onChange={() => setStrictness('soft')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Weich (Wunsch)
                </label>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: strictness === 'hard' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    borderColor: strictness === 'hard' ? 'var(--danger)' : 'var(--border)',
                    color: strictness === 'hard' ? 'var(--danger)' : 'var(--text-main)',
                    fontWeight: 600,
                    transition: 'var(--transition)'
                  }}
                >
                  <input
                    type="radio"
                    name="strictness"
                    checked={strictness === 'hard'}
                    onChange={() => setStrictness('hard')}
                    style={{ accentColor: 'var(--danger)' }}
                  />
                  Hart (Pflicht)
                </label>
              </div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Plus size={18} />
              Regel hinzufügen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
