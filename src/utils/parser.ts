import type { Student, Rule, SpecialNeed, RuleType } from '../types';
import { newId } from './ids';

export interface ParseResult {
  parsedIntent: string;
  updatedRules: Rule[];
  updatedStudents: Student[];
  explanation: string;
}

export function parseNaturalLanguageCommand(
  command: string,
  currentStudents: Student[],
  currentRules: Rule[]
): ParseResult {
  const normalizedCommand = command.toLowerCase().trim();
  let parsedIntent = 'Befehl nicht eindeutig verstanden.';
  let explanation = 'Der Befehl konnte keiner bekannten Aktion zugeordnet werden. Bitte versuche Formulierungen wie "Setze Jonas neben Marie" oder "Trenne Robin und Leo".';
  
  // Clone current rules and students to make mutations
  let updatedRules = [...currentRules];
  let updatedStudents = [...currentStudents];


  // 1. SEPARATE CONFLICTING / TALKATIVE STUDENTS ("trenne A und B", "A nicht neben B")
  if (
    normalizedCommand.includes('trenne') ||
    normalizedCommand.includes('nicht neben') ||
    normalizedCommand.includes('auseinander')
  ) {
    // Find all students mentioned
    const mentioned: Student[] = [];
    currentStudents.forEach((student) => {
      if (normalizedCommand.includes(student.name.toLowerCase())) {
        mentioned.push(student);
      }
    });

    if (mentioned.length >= 2) {
      const [s1, s2] = mentioned;
      
      // Remove any existing 'beside' or 'near' rules between these two
      updatedRules = updatedRules.filter(
        (r) =>
          !((r.studentId === s1.id && r.targetId === s2.id) || (r.studentId === s2.id && r.targetId === s1.id))
      );

      // Add hard 'not_beside' rule
      const ruleId1 = newId(`ai-rule-notbeside-${s1.id}-${s2.id}`);
      updatedRules.push({
        id: ruleId1,
        studentId: s1.id,
        type: 'not_beside',
        targetId: s2.id,
        strictness: 'hard',
      });

      parsedIntent = `Trennungsregel für ${s1.name} und ${s2.name} hinzugefügt.`;
      explanation = `Ich habe verstanden, dass **${s1.name}** und **${s2.name}** unruhig sind oder sich ablenken. Ich habe daher eine harte Regel erstellt, die verhindert, dass sie direkt nebeneinander sitzen.`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  // 2. PLACE FRIENDS TOGETHER ("setze A neben B", "A und B zusammen", "A und B nebeneinander")
  if (
    normalizedCommand.includes('neben') ||
    normalizedCommand.includes('zusammen') ||
    normalizedCommand.includes('nebeneinander') ||
    normalizedCommand.includes('bei')
  ) {
    const mentioned: Student[] = [];
    currentStudents.forEach((student) => {
      if (normalizedCommand.includes(student.name.toLowerCase())) {
        mentioned.push(student);
      }
    });

    if (mentioned.length >= 2) {
      const [s1, s2] = mentioned;

      // Remove any conflicting 'not_beside' or 'far' rules between these two
      updatedRules = updatedRules.filter(
        (r) =>
          !((r.studentId === s1.id && r.targetId === s2.id) || (r.studentId === s2.id && r.targetId === s1.id))
      );

      // Add soft 'beside' rule
      const ruleId = newId(`ai-rule-beside-${s1.id}-${s2.id}`);
      updatedRules.push({
        id: ruleId,
        studentId: s1.id,
        type: 'beside',
        targetId: s2.id,
        strictness: 'soft',
      });

      parsedIntent = `Freundschaftsregel für ${s1.name} und ${s2.name} hinzugefügt.`;
      explanation = `Ich habe **${s1.name}** und **${s2.name}** als Wunschnachbarn eingetragen. Der Solver wird versuchen, sie nebeneinander zu platzieren, sofern keine harten Regeln dem widersprechen.`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  // 3. SEPARATE ALL DISTURBING STUDENTS ("setze störende schüler auseinander", "ruhe im klassenzimmer", "lautstärke senken")
  if (
    normalizedCommand.includes('störend') ||
    normalizedCommand.includes('unruhig') ||
    normalizedCommand.includes('ruhe') ||
    normalizedCommand.includes('auseinander setzen') ||
    normalizedCommand.includes('trenne alle störenden')
  ) {
    // Find all students with behavioral tags
    const behaviorStudents = currentStudents.filter((s) => s.specialNeeds.includes('Verhalten'));

    if (behaviorStudents.length > 1) {
      let addedRulesCount = 0;
      // Add mutual hard not_beside rules for all pairs
      for (let i = 0; i < behaviorStudents.length; i++) {
        for (let j = i + 1; j < behaviorStudents.length; j++) {
          const s1 = behaviorStudents[i];
          const s2 = behaviorStudents[j];

          // Check if rule already exists
          const exists = updatedRules.some(
            (r) =>
              r.type === 'not_beside' &&
              ((r.studentId === s1.id && r.targetId === s2.id) || (r.studentId === s2.id && r.targetId === s1.id))
          );

          if (!exists) {
            updatedRules.push({
              id: newId(`ai-noise-${s1.id}-${s2.id}`),
              studentId: s1.id,
              type: 'not_beside',
              targetId: s2.id,
              strictness: 'hard',
            });
            addedRulesCount++;
          }
        }
      }

      parsedIntent = `Lärmprävention aktiv: ${behaviorStudents.length} unruhige Schüler voneinander getrennt.`;
      explanation = `Ich habe alle unruhigen Schüler mit erhöhtem Verhaltenstags (${behaviorStudents.map((s) => s.name).join(', ')}) analysiert. Ich habe ${addedRulesCount} neue Sitzverbote (harte Regeln) generiert, damit diese Schüler im Klassenzimmer weiträumig verteilt platziert werden, um die Lautstärke zu senken.`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    } else {
      parsedIntent = 'Keine störenden Schüler klassifiziert.';
      explanation = 'Um störende Schüler auseinanderzusetzen, markiere bitte zuerst mindestens zwei Schüler in der Schülerliste mit dem Tag "Verhalten"!';
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  // 4. VISION IMPAIRMENT TO FRONT ("sehschwäche nach vorne", "brille nach vorne", "brillenträger")
  if (
    normalizedCommand.includes('sehschwäche') ||
    normalizedCommand.includes('brille') ||
    normalizedCommand.includes('sehen') ||
    normalizedCommand.includes('schlecht sehen')
  ) {
    const visionImpaired = currentStudents.filter((s) => s.specialNeeds.includes('Sehschwäche'));

    if (visionImpaired.length > 0) {
      visionImpaired.forEach((student) => {
        const hasFrontRule = updatedRules.some((r) => r.studentId === student.id && r.type === 'front');
        if (!hasFrontRule) {
          updatedRules.push({
            id: newId(`ai-vision-${student.id}`),
            studentId: student.id,
            type: 'front',
            strictness: 'hard',
          });
        }
      });

      parsedIntent = `Optimierung für Sehschwächen: ${visionImpaired.length} Schüler nach vorne gesetzt.`;
      explanation = `Ich habe alle Schüler mit Sehschwäche (${visionImpaired.map((s) => s.name).join(', ')}) identifiziert. Damit sie die Tafel optimal lesen können, habe ich feste Regeln hinterlegt, die sie in das vordere Drittel des Raumes nahe der Tafel setzen.`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    } else {
      parsedIntent = 'Keine Schüler mit Sehschwäche vorhanden.';
      explanation = 'Es sind aktuell keine Schüler in der Klasse mit dem Tag "Sehschwäche" hinterlegt. Füge diesen Tag erst bei einem Schüler in der Schülerverwaltung hinzu!';
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  // 5. SEAT SINGLE STUDENT TO FRONT/BACK ("setze A nach hinten", "setze B nach vorne")
  const singleStudent = currentStudents.find((s) =>
    normalizedCommand.includes(s.name.toLowerCase())
  );

  if (singleStudent) {
    let position: RuleType | null = null;
    let positionWord = '';

    if (normalizedCommand.includes('vorne') || normalizedCommand.includes('vorderen')) {
      position = 'front';
      positionWord = 'vorderste Reihe';
    } else if (normalizedCommand.includes('hinten') || normalizedCommand.includes('hinteren')) {
      position = 'back';
      positionWord = 'hintere Reihe';
    } else if (normalizedCommand.includes('rand') || normalizedCommand.includes('außen')) {
      position = 'edge';
      positionWord = 'am Rand';
    } else if (normalizedCommand.includes('fensterweg') || normalizedCommand.includes('nicht am fenster')) {
      position = 'not_window';
      positionWord = 'weg vom Fenster';
    } else if (normalizedCommand.includes('tür')) {
      position = 'near_door';
      positionWord = 'nahe der Tür';
    } else if (normalizedCommand.includes('tafel')) {
      position = 'near_board';
      positionWord = 'nahe der Tafel';
    }

    if (position) {
      // Remove previous conflicting position rules for this student
      updatedRules = updatedRules.filter(
        (r) => r.studentId === singleStudent.id && !['front', 'back', 'edge', 'near_door', 'near_board', 'not_window'].includes(r.type)
      );

      updatedRules.push({
        id: newId(`ai-pos-${singleStudent.id}-${position}`),
        studentId: singleStudent.id,
        type: position,
        strictness: 'hard',
      });

      parsedIntent = `Platzierungsregel für ${singleStudent.name} (${positionWord}) hinzugefügt.`;
      explanation = `Ich habe eine harte Regel erstellt, um **${singleStudent.name}** in der **${positionWord}** zu platzieren. Dies wird beim Berechnen des nächsten Sitzplans fest berücksichtigt.`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  // 6. CLEAR ALL RULES ("lösche alle regeln", "regeln zurücksetzen", "alles zurücksetzen")
  if (normalizedCommand.includes('lösch') && (normalizedCommand.includes('regeln') || normalizedCommand.includes('alles'))) {
    updatedRules = [];
    parsedIntent = 'Alle Sitzregeln gelöscht.';
    explanation = 'Ich habe sämtliche benutzerdefinierten Sitzregeln gelöscht. Der Sitzplan wird nun rein zufällig bzw. nur noch basierend auf den Standard-Schnittstellen für besondere Förderbedarfe (wie Rollstuhl/Sehschwäche) optimiert.';
    return { parsedIntent, updatedRules, updatedStudents, explanation };
  }

  // 7. ASSIGN A SPECIAL NEED ("mache A zum brillenträger", "A hat sehschwäche")
  if (
    (normalizedCommand.includes('hat') || normalizedCommand.includes('ist')) &&
    singleStudent
  ) {
    let need: SpecialNeed | null = null;
    let needText = '';

    if (normalizedCommand.includes('sehschwäche') || normalizedCommand.includes('brille')) {
      need = 'Sehschwäche';
      needText = 'Sehschwäche';
    } else if (normalizedCommand.includes('hörschwäche') || normalizedCommand.includes('schwerhörig') || normalizedCommand.includes('ohren')) {
      need = 'Hörschwäche';
      needText = 'Hörschwäche';
    } else if (normalizedCommand.includes('konzentration') || normalizedCommand.includes('zappel') || normalizedCommand.includes('adhs')) {
      need = 'Konzentrationsbedarf';
      needText = 'Konzentrationsbedarf';
    } else if (normalizedCommand.includes('stört') || normalizedCommand.includes('quatscht') || normalizedCommand.includes('laut')) {
      need = 'Verhalten';
      needText = 'Verhaltensförderbedarf (Unruhe)';
    } else if (normalizedCommand.includes('rollstuhl') || normalizedCommand.includes('gehbehinderung') || normalizedCommand.includes('barrierefrei')) {
      need = 'Barrierefreiheit';
      needText = 'Barrierefreiheit (Rollstuhl)';
    }

    if (need) {
      updatedStudents = updatedStudents.map((s) => {
        if (s.id === singleStudent.id) {
          const needsSet = new Set(s.specialNeeds);
          needsSet.add(need!);
          return { ...s, specialNeeds: Array.from(needsSet) };
        }
        return s;
      });

      parsedIntent = `Spezialbedarf "${needText}" für ${singleStudent.name} eingetragen.`;
      explanation = `Ich habe den Förderbedarf **"${needText}"** bei **${singleStudent.name}** vermerkt. Dadurch greifen automatisch die zugehörigen Sitzplan-Optimierungen (z. B. vordere Reihen für Sehschwächen oder Lärmtrennung bei unruhigen Schülern).`;
      return { parsedIntent, updatedRules, updatedStudents, explanation };
    }
  }

  return { parsedIntent, updatedRules, updatedStudents, explanation };
}
