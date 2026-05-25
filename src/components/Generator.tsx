import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  AlertTriangle,
  RotateCcw,
  Send,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import type {
  Student,
  Rule,
  ClassroomLayout,
  SeatingProposal,
  SolverDiagnostics
} from '../types';
import { generateSeatingPlan, evaluateSeating, analyzeSeatingDiagnostics } from '../utils/solver';
import { parseNaturalLanguageCommand } from '../utils/parser';
import { newId } from '../utils/ids';

interface GeneratorProps {
  students: Student[];
  rules: Rule[];
  layout: ClassroomLayout;
  onUpdateRules: (rules: Rule[]) => void;
  onUpdateStudents: (students: Student[]) => void;
  activeClassName: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

type BottleneckKind = SolverDiagnostics['bottlenecks'][number]['kind'];

const bottleneckLabels: Record<BottleneckKind, string> = {
  frontRow: 'Vordere Plätze',
  doorAccess: 'Tür / Randplätze',
  window: 'Fensterarme Plätze'
};

export const Generator: React.FC<GeneratorProps> = ({
  students,
  rules,
  layout,
  onUpdateRules,
  onUpdateStudents,
  activeClassName
}) => {
  const [proposals, setProposals] = useState<SeatingProposal[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string>('');
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  
  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hallo! Ich bin dein KI-Sitzplan-Assistent für die ${activeClassName || 'Klasse'}. 
      Gib mir einfach Anweisungen in natürlicher Sprache wie:
      • „Setze Jonas und Robin auseinander“
      • „Bringe Schüler mit Sehschwäche nach vorne“
      • „Setze Jacob neben David“
      • „Lösche alle Regeln“`
    }
  ]);

  const cellSize = 56; // slightly larger for names in desks
  const gridWidth = layout.width * cellSize;
  const gridHeight = layout.height * cellSize;

  const desks = layout.elements.filter((el) => el.type === 'desk');
  const board = layout.elements.find((el) => el.type === 'board') || {
    id: 'fallback-board',
    type: 'board' as const,
    x: layout.width / 2,
    y: 0,
    w: 4,
    h: 1,
    rotation: 0 as const
  };
  const doors = layout.elements.filter((el) => el.type === 'door');

  // Generate Proposals initially or when layout/students/rules change
  const handleCalculatePlans = () => {
    if (students.length === 0) return;
    try {
      const propA = generateSeatingPlan(students, rules, layout, 'balanced');
      const propB = generateSeatingPlan(students, rules, layout, 'focus');
      const propC = generateSeatingPlan(students, rules, layout, 'friendship');

      setProposals([propA, propB, propC]);
      setActiveProposalId(propA.id);
      setSelectedSeatId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Berechnen des Sitzplans.';
      alert(message);
    }
  };

  // Auto-calc once when entering with students but no proposals yet.
  // Deferred to a microtask so the state update doesn't fire synchronously
  // inside the effect; deps intentionally narrow so we don't restart on
  // every render of proposals/handleCalculatePlans.
  useEffect(() => {
    if (students.length > 0 && proposals.length === 0) {
      const t = setTimeout(() => handleCalculatePlans(), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const activeProposal = proposals.find((p) => p.id === activeProposalId);

  // Seat Click handler (for visual inspection and swapping)
  const handleSeatClick = (deskId: string) => {
    if (!activeProposal) return;

    if (selectedSeatId === null) {
      setSelectedSeatId(deskId);
    } else {
      // Swapping seats action!
      if (selectedSeatId === deskId) {
        setSelectedSeatId(null);
        return;
      }

      const updatedAssignments = { ...activeProposal.assignments };
      const student1 = updatedAssignments[selectedSeatId];
      const student2 = updatedAssignments[deskId];

      updatedAssignments[selectedSeatId] = student2;
      updatedAssignments[deskId] = student1;

      // Re-evaluate seating quality
      // Extract the preset type from activeProposal.id
      let presetType: 'balanced' | 'focus' | 'friendship' = 'balanced';
      if (activeProposal.id.includes('focus')) presetType = 'focus';
      else if (activeProposal.id.includes('friendship')) presetType = 'friendship';

      const evaluation = evaluateSeating(updatedAssignments, students, rules, layout, presetType);

      // Create new updated proposal
      const updatedProposal: SeatingProposal = {
        ...activeProposal,
        assignments: updatedAssignments,
        score: evaluation.score,
        violations: evaluation.violations,
        explanation: `Manuell angepasster Plan (${activeProposal.name.split(':')[0]}).`,
        valid: !evaluation.violations.some((v) => v.type === 'hard'),
        diagnostics: analyzeSeatingDiagnostics(updatedAssignments, students, rules, layout, evaluation.violations)
      };

      setProposals(proposals.map((p) => (p.id === activeProposalId ? updatedProposal : p)));
      setSelectedSeatId(null);
    }
  };

  // AI Chat Submit Handler
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const userMsg: ChatMessage = {
      id: newId('user'),
      sender: 'user',
      text: userText
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');

    // Parse NLP command!
    setTimeout(() => {
      const result = parseNaturalLanguageCommand(userText, students, rules);

      // Apply updates to Master state
      onUpdateRules(result.updatedRules);
      onUpdateStudents(result.updatedStudents);

      const aiMsg: ChatMessage = {
        id: newId('ai'),
        sender: 'ai',
        text: `**Ergebnis**: ${result.parsedIntent}\n\n${result.explanation}\n\n*Ich habe die Berechnung des Sitzplans automatisch aktualisiert!*`
      };

      setChatHistory((prev) => [...prev, aiMsg]);

      // Regenerate plans incorporating new rules
      try {
        const propA = generateSeatingPlan(result.updatedStudents, result.updatedRules, layout, 'balanced');
        const propB = generateSeatingPlan(result.updatedStudents, result.updatedRules, layout, 'focus');
        const propC = generateSeatingPlan(result.updatedStudents, result.updatedRules, layout, 'friendship');

        setProposals([propA, propB, propC]);
        // Keep active proposal type aligned if possible
        if (activeProposalId.includes('focus')) {
          setActiveProposalId(propB.id);
        } else if (activeProposalId.includes('friendship')) {
          setActiveProposalId(propC.id);
        } else {
          setActiveProposalId(propA.id);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400);
  };

  const getStudentName = (id: string) => {
    return students.find((s) => s.id === id)?.name || 'Unbekannt';
  };

  const getStudentSpecialNeeds = (studentId: string): string[] => {
    return students.find((s) => s.id === studentId)?.specialNeeds || [];
  };

  const renderDiagnosticsPanel = (proposal: SeatingProposal) => {
    const diagnostics = proposal.diagnostics;
    if (!diagnostics) return null;

    const hasDiagnostics =
      diagnostics.unplacedStudents.length > 0 ||
      diagnostics.bottlenecks.length > 0 ||
      diagnostics.contradictoryRules.length > 0 ||
      Boolean(diagnostics.note);

    if (!hasDiagnostics) return null;

    return (
      <div className="diagnostics-panel">
        <div className="diagnostics-panel-header">
          <AlertTriangle size={16} />
          <span>Solver-Diagnose</span>
        </div>

        <div className="diagnostics-grid">
          {diagnostics.bottlenecks.map((bottleneck) => (
            <div className="diagnostics-row" key={bottleneck.kind}>
              <span>{bottleneckLabels[bottleneck.kind]}</span>
              <strong>{bottleneck.required} gebraucht / {bottleneck.available} verfügbar</strong>
            </div>
          ))}

          {diagnostics.contradictoryRules.map((conflict, index) => (
            <div className="diagnostics-row" key={`${conflict.ruleIds.join('-')}-${index}`}>
              <span>Widerspruch</span>
              <strong>{conflict.reason}</strong>
            </div>
          ))}

          {diagnostics.unplacedStudents.map((studentId) => (
            <div className="diagnostics-row" key={studentId}>
              <span>Nicht platziert</span>
              <strong>{getStudentName(studentId)}</strong>
            </div>
          ))}
        </div>

        {diagnostics.note && (
          <p className="diagnostics-note">{diagnostics.note}</p>
        )}
      </div>
    );
  };

  // SVG coordinates lookup helpers
  const getDeskCoordinates = (deskId: string) => {
    const d = desks.find((desk) => desk.id === deskId);
    if (!d) return null;
    return {
      x: d.x * cellSize + cellSize / 2,
      y: d.y * cellSize + cellSize / 2
    };
  };

  // Find relationships to draw lines for selected desk
  const renderRelationsLines = () => {
    if (!selectedSeatId || !activeProposal) return null;
    const activeStudentId = activeProposal.assignments[selectedSeatId];
    if (!activeStudentId) return null;

    const sourceCoords = getDeskCoordinates(selectedSeatId);
    if (!sourceCoords) return null;

    // Filter rules related to active student
    const activeRules = rules.filter(
      (r) => r.studentId === activeStudentId || r.targetId === activeStudentId
    );

    return activeRules.map((rule) => {
      // Find other student desk
      const otherStudentId = rule.studentId === activeStudentId ? rule.targetId : rule.studentId;
      if (!otherStudentId) {
        // Location rules, optionally draw to window/door/board
        if (rule.type === 'near_board' || rule.type === 'front') {
          const boardCoords = { x: board.x * cellSize + (board.w * cellSize) / 2, y: board.y * cellSize + cellSize };
          return (
            <line
              key={rule.id}
              x1={sourceCoords.x}
              y1={sourceCoords.y}
              x2={boardCoords.x}
              y2={boardCoords.y}
              stroke="var(--primary)"
              strokeWidth={2}
              strokeDasharray="4,4"
            />
          );
        }
        if (rule.type === 'near_door') {
          const doorElement = doors[0];
          if (doorElement) {
            const doorCoords = { x: doorElement.x * cellSize + cellSize / 2, y: doorElement.y * cellSize + cellSize / 2 };
            return (
              <line
                key={rule.id}
                x1={sourceCoords.x}
                y1={sourceCoords.y}
                x2={doorCoords.x}
                y2={doorCoords.y}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            );
          }
        }
        return null;
      }

      // Find desk occupied by otherStudentId
      const otherDeskId = Object.keys(activeProposal.assignments).find(
        (key) => activeProposal.assignments[key] === otherStudentId
      );

      if (!otherDeskId) return null;
      const destCoords = getDeskCoordinates(otherDeskId);
      if (!destCoords) return null;

      const isForbidden = rule.type === 'not_beside' || rule.type === 'far';
      const strokeColor = isForbidden ? 'var(--danger)' : 'var(--success)';

      return (
        <line
          key={rule.id}
          x1={sourceCoords.x}
          y1={sourceCoords.y}
          x2={destCoords.x}
          y2={destCoords.y}
          stroke={strokeColor}
          strokeWidth={3}
          markerEnd={rule.type === 'far' ? 'url(#arrow)' : undefined}
        />
      );
    });
  };

  return (
    <div className="generator-view">
      {students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
          <h3>Keine Schüler vorhanden</h3>
          <p style={{ color: 'var(--text-muted)' }}>Füge im Reiter "Schülerverwaltung" Schüler hinzu oder lade eine Beispielklasse im Dashboard.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Action Header Card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={22} style={{ color: 'var(--primary)' }} />
                  Sitzplan-Generator
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Berechne vollautomatische Sitzordnungen basierend auf all deinen Vorgaben. Klicke zwei Schüler nacheinander an, um sie manuell zu tauschen.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleCalculatePlans}>
                  <RotateCcw size={16} />
                  Sitzplan neu berechnen
                </button>
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  <Printer size={16} />
                  Plan drucken
                </button>
              </div>
            </div>

            {/* Proposal Selection Tabs */}
            {proposals.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', overflowX: 'auto' }}>
                {proposals.map((p) => {
                  const isActive = p.id === activeProposalId;
                  const isPrefPerfect = p.score >= 950 && p.valid;
                  return (
                    <button
                      key={p.id}
                      className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setActiveProposalId(p.id);
                        setSelectedSeatId(null);
                      }}
                      style={{
                        flex: 1,
                        minWidth: '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.75rem 1.25rem',
                        gap: '0.25rem',
                        textAlign: 'left',
                        borderColor: !p.valid ? 'var(--danger)' : undefined,
                        boxShadow: !p.valid ? 'inset 0 0 0 1px var(--danger)' : undefined
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', opacity: isActive ? 0.9 : 0.6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {p.name.split(':')[0]}
                        {!p.valid && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--danger)',
                              color: '#fff',
                              letterSpacing: '0.02em'
                            }}
                          >
                            UNGÜLTIG
                          </span>
                        )}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                          Score: {p.score} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>/ 1000</span>
                        </span>
                        {!p.valid ? (
                          <AlertTriangle size={18} style={{ color: isActive ? 'white' : 'var(--danger)' }} />
                        ) : isPrefPerfect ? (
                          <ShieldCheck size={18} style={{ color: isActive ? 'white' : 'var(--success)' }} />
                        ) : (
                          <Award size={18} style={{ color: isActive ? 'white' : 'var(--accent)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hard-Conflict Banner (M2 Slice 1): shown whenever any proposal is invalid */}
          {proposals.some((p) => !p.valid) && (
            <div className="hard-conflict-banner" role="alert">
              <AlertTriangle size={18} />
              <span>Plan enthält harte Konflikte. Bitte Regeln prüfen.</span>
            </div>
          )}

          {/* Diagnostic Panel: shown when no valid proposal exists */}
          {proposals.length > 0 && proposals.every((p) => !p.valid) && (() => {
            // Aggregate hard violations across all proposals (de-duplicated by description+studentId).
            const hardSet = new Map<string, { studentId: string; description: string }>();
            proposals.forEach((p) => {
              p.violations.filter((v) => v.type === 'hard').forEach((v) => {
                const key = `${v.studentId}|${v.description}`;
                if (!hardSet.has(key)) {
                  hardSet.set(key, { studentId: v.studentId, description: v.description });
                }
              });
            });
            const hardList = Array.from(hardSet.values());
            return (
              <div
                className="card"
                style={{
                  marginBottom: 0,
                  borderLeft: '4px solid var(--danger)',
                  background: 'var(--surface)'
                }}
              >
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem', color: 'var(--danger)' }}>
                  <AlertTriangle size={20} />
                  Diagnose: Keine gültige Sitzordnung möglich
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Alle drei Vorschläge verletzen mindestens eine harte Regel. Die Pläne werden unten als Diagnose angezeigt — du erkennst, welche Vorgaben sich aktuell nicht erfüllen lassen.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {hardList.map((v, i) => (
                    <div
                      key={`${v.studentId}-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        padding: '0.4rem 0.75rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: 'var(--danger)',
                        borderLeft: '3px solid var(--danger)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span><strong>{getStudentName(v.studentId)}</strong>: {v.description}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.75rem', marginBottom: 0 }}>
                  Tipp: Reduziere widersprüchliche Regeln, ergänze passende Sitzplätze (vorne / am Rand / nahe Tür) im Raumeditor oder lockere einzelne Regeln auf „weich".
                </p>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="view-selector-panels">
            {/* Left side: Seating Grid */}
            {activeProposal && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <div className="card print-visible" style={{ marginBottom: 0 }}>
                  <h3 className="card-title print-header" style={{ display: 'none' }}>
                    Sitzplan für die {activeClassName} - {activeProposal.name.split(':')[0]}
                  </h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }} className="rule-editor-controls">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      {activeProposal.valid ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                      )}
                      Aktiv: {activeProposal.name}
                      {!activeProposal.valid && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--danger)',
                            color: '#fff',
                            marginLeft: '0.4rem'
                          }}
                        >
                          Ungültig — verletzt harte Regeln
                        </span>
                      )}
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {selectedSeatId ? '💡 Klicke auf einen zweiten Schüler, um Plätze zu tauschen' : '💡 Wähle einen Schüler aus, um Beziehungen anzuzeigen'}
                    </span>
                  </div>

                  {!activeProposal.valid && (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        marginBottom: '1.25rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderLeft: '4px solid var(--danger)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.88rem',
                        color: 'var(--danger)'
                      }}
                    >
                      <strong>Diagnoseplan:</strong> Dieser Vorschlag verletzt {activeProposal.violations.filter((v) => v.type === 'hard').length} harte Regel(n) und ist nicht einsatzbereit. Sieh dir die markierten Plätze und die Liste „Regelverletzungen" an.
                    </div>
                  )}

                  <div className="grid-viewport" style={{ padding: '2rem' }}>
                    <svg
                      className="classroom-svg-grid"
                      width={gridWidth}
                      height={gridHeight}
                      viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                    >
                      {/* Grid Lines */}
                      {Array.from({ length: layout.width + 1 }).map((_, i) => (
                        <line key={`v-${i}`} className="grid-line" x1={i * cellSize} y1={0} x2={i * cellSize} y2={gridHeight} />
                      ))}
                      {Array.from({ length: layout.height + 1 }).map((_, i) => (
                        <line key={`h-${i}`} className="grid-line" x1={0} y1={i * cellSize} x2={gridWidth} y2={i * cellSize} />
                      ))}

                      {/* Placed Elements */}
                      {layout.elements.map((el) => {
                        const px = el.x * cellSize + 2;
                        const py = el.y * cellSize + 2;
                        const pw = el.w * cellSize - 4;
                        const ph = el.h * cellSize - 4;

                        if (el.type !== 'desk') {
                          // Standard background decoration elements
                          let colorClass = 'svg-furniture';
                          if (el.type === 'board') colorClass = 'svg-board';
                          else if (el.type === 'window') colorClass = 'svg-window';
                          else if (el.type === 'door') colorClass = 'svg-door';
                          else if (el.type === 'cupboard') colorClass = 'svg-cupboard';

                          return (
                            <g key={el.id}>
                              <rect className={colorClass} x={px} y={py} width={pw} height={ph} rx={6} />
                              <text
                                className="svg-text"
                                x={px + pw / 2}
                                y={py + ph / 2}
                                style={{ fill: el.type === 'board' ? 'white' : 'var(--text-main)' }}
                              >
                                {el.label || el.type}
                              </text>
                            </g>
                          );
                        }

                        // It is a Desk seat! Check occupied student
                        const assignedStudentId = activeProposal.assignments[el.id];
                        const isOccupied = !!assignedStudentId;
                        const studentName = isOccupied ? getStudentName(assignedStudentId) : 'Frei';
                        const specialNeeds = isOccupied ? getStudentSpecialNeeds(assignedStudentId) : [];

                        const isSelected = selectedSeatId === el.id;

                        // Check active violations for this student desk
                        const hasHardViolation = activeProposal.violations.some(
                          (v) => v.studentId === assignedStudentId && v.type === 'hard'
                        );
                        const hasSoftViolation = activeProposal.violations.some(
                          (v) => v.studentId === assignedStudentId && v.type === 'soft'
                        );

                        let strokeColor = 'var(--border)';
                        let strokeWidth = 2;
                        if (isSelected) {
                          strokeColor = 'var(--secondary)';
                          strokeWidth = 3;
                        } else if (hasHardViolation) {
                          strokeColor = 'var(--danger)';
                          strokeWidth = 3;
                        } else if (hasSoftViolation) {
                          strokeColor = 'var(--accent)';
                          strokeWidth = 2.5;
                        } else if (isOccupied) {
                          strokeColor = 'var(--primary)';
                        }

                        return (
                          <g key={el.id} onClick={() => handleSeatClick(el.id)} style={{ cursor: 'pointer' }}>
                            <rect
                              className={isOccupied ? 'svg-desk occupied' : 'svg-desk'}
                              x={px}
                              y={py}
                              width={pw}
                              height={ph}
                              rx={8}
                              stroke={strokeColor}
                              strokeWidth={strokeWidth}
                            />
                            
                            {/* Special Needs Colored Badges inside Desk */}
                            {isOccupied && specialNeeds.length > 0 && (
                              <g transform={`translate(${px + 6}, ${py + 8})`}>
                                {specialNeeds.map((need, nIndex) => {
                                  let dotColor = 'var(--primary)';
                                  if (need === 'Verhalten') dotColor = 'var(--danger)';
                                  else if (need === 'Sehschwäche' || need === 'Hörschwäche') dotColor = 'var(--secondary)';
                                  else if (need === 'Konzentrationsbedarf') dotColor = 'var(--accent)';
                                  else if (need === 'Barrierefreiheit') dotColor = 'var(--success)';

                                  return (
                                    <circle
                                      key={need}
                                      cx={nIndex * 8}
                                      cy={0}
                                      r={3}
                                      fill={dotColor}
                                    />
                                  );
                                })}
                              </g>
                            )}

                            {/* Name display */}
                            <text className="svg-text" x={px + pw / 2} y={py + ph / 2 - 3}>
                              {isOccupied ? studentName.split(' ')[0] : 'Frei'}
                            </text>
                            {isOccupied && studentName.split(' ')[1] && (
                              <text className="svg-text-sub" x={px + pw / 2} y={py + ph / 2 + 10}>
                                {studentName.split(' ')[1]}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Arrow marker definition */}
                      <defs>
                        <marker
                          id="arrow"
                          viewBox="0 0 10 10"
                          refX="5"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--danger)" />
                        </marker>
                      </defs>

                      {/* Render Relationship Overlay Lines */}
                      {renderRelationsLines()}
                    </svg>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1rem', textAlign: 'center' }}>
                    * Die farbigen Punkte auf besetzten Pulten kennzeichnen besondere Förderbedarfe. Rote Ränder zeigen verletzte harte Regeln, gelbe Ränder weiche Konflikte.
                  </p>

                  <div className="print-legend">
                    <div>🔲 Sitzplatz (Belegt)</div>
                    <div>🔴 Konflikt / Harte Regel verletzt</div>
                    <div>🟡 Weicher Wunsch nicht erfüllt</div>
                    <div>⚫ Tafel (Vorne)</div>
                  </div>
                </div>

                <div className="grid-2">
                  {/* Explanations & Violations Card */}
                  <div className="card">
                    <h3 className="card-title">Qualitätsbewertung & Details</h3>
                    <p
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.95rem',
                        lineHeight: 1.4,
                        marginBottom: '1.25rem',
                        borderLeft: '4px solid var(--primary)',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {activeProposal.explanation}
                    </p>

                    {renderDiagnosticsPanel(activeProposal)}

                    <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Regelverletzungen</h4>
                    {activeProposal.violations.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                        <CheckCircle2 size={16} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Keine Konflikte! Perfekter Sitzplan.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {activeProposal.violations.map((v) => (
                          <div
                            key={v.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.85rem',
                              padding: '0.4rem 0.75rem',
                              backgroundColor: v.type === 'hard' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                              color: v.type === 'hard' ? 'var(--danger)' : '#b45309',
                              borderLeft: `3px solid ${v.type === 'hard' ? 'var(--danger)' : 'var(--accent)'}`,
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            <AlertTriangle size={14} />
                            <span>
                              <strong>{getStudentName(v.studentId)}</strong>: {v.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Assistant chat component */}
                  <div className="card" style={{ padding: 0 }}>
                    <div style={{
                      padding: '1.25rem',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'var(--bg-sidebar)'
                    }}>
                      <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>KI-Assistenten-Panel</h3>
                    </div>

                    <div className="chat-container">
                      <div className="chat-history">
                        {chatHistory.map((msg) => (
                          <div
                            key={msg.id}
                            className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}
                          >
                            {msg.sender === 'ai' ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: msg.text
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\* (.*?)\n/g, '• $1<br/>')
                                    .replace(/\n\n/g, '<br/><br/>')
                                    .replace(/\n/g, '<br/>')
                                }}
                              />
                            ) : (
                              msg.text
                            )}
                          </div>
                        ))}
                      </div>

                      <form className="chat-input-area" onSubmit={handleChatSubmit}>
                        <input
                          className="form-input"
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="z. B. Trenne Jonas und Robin..."
                          style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" type="submit" style={{ padding: '0.65rem' }}>
                          <Send size={18} />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Dynamic Printing Table of Student Assignments */}
      {activeProposal && (
        <div className="print-student-list">
          <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '10px' }}>Schülerliste & Platzzuordnung</h3>
          <table className="print-student-table">
            <thead>
              <tr>
                <th>Schüler</th>
                <th>Sitzplatz / Desk</th>
                <th>Besonderer Bedarf / Notizen</th>
              </tr>
            </thead>
            <tbody>
              {students
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((student) => {
                  const deskId = Object.keys(activeProposal.assignments).find(
                    (key) => activeProposal.assignments[key] === student.id
                  );
                  const deskLabel = deskId ? layout.elements.find((el) => el.id === deskId)?.label || 'Zugeordnet' : 'Nicht zugeordnet';
                  
                  return (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{deskLabel}</td>
                      <td>{student.specialNeeds.join(', ') || 'Keine'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
