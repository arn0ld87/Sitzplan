import Foundation

enum SeatingSolver {
    static func generateProposals(students: [Student], rules: [Rule], layout: ClassroomLayout) -> [SeatingProposal] {
        SolverProfile.allCases.map { profile in
            generate(students: students, rules: rules, layout: layout, profile: profile)
        }
    }

    private static func generate(students: [Student], rules: [Rule], layout: ClassroomLayout, profile: SolverProfile) -> SeatingProposal {
        let desks = layout.elements.filter { $0.type == .desk }.sorted { lhs, rhs in
            if lhs.y == rhs.y { lhs.x < rhs.x } else { lhs.y < rhs.y }
        }
        let orderedStudents = orderStudents(students, profile: profile)
        var assignments: [String: UUID] = [:]

        for (index, student) in orderedStudents.prefix(desks.count).enumerated() {
            assignments[desks[index].id] = student.id
        }

        let result = evaluate(assignments: assignments, students: students, rules: rules, layout: layout, profile: profile)
        return SeatingProposal(
            id: profile.rawValue,
            name: profile.title,
            assignments: assignments,
            score: result.score,
            violations: result.violations,
            explanation: explanation(for: profile, result: result)
        )
    }

    static func evaluate(
        assignments: [String: UUID],
        students: [Student],
        rules: [Rule],
        layout: ClassroomLayout,
        profile: SolverProfile
    ) -> (score: Int, violations: [SeatingViolation]) {
        let desksById = Dictionary(uniqueKeysWithValues: layout.elements.filter { $0.type == .desk }.map { ($0.id, $0) })
        let deskForStudent = Dictionary(uniqueKeysWithValues: assignments.map { ($0.value, $0.key) })
        var score = 1000
        var violations: [SeatingViolation] = []

        for rule in rules {
            guard let deskId = deskForStudent[rule.studentId], let desk = desksById[deskId] else { continue }
            let targetDesk = rule.targetId.flatMap { deskForStudent[$0] }.flatMap { desksById[$0] }
            let passed = passes(rule: rule, desk: desk, targetDesk: targetDesk, layout: layout)
            if passed {
                score += rule.strictness == .hard ? 35 : 18
            } else {
                score -= rule.strictness == .hard ? 240 : 60
                violations.append(
                    SeatingViolation(
                        id: UUID(),
                        studentId: rule.studentId,
                        ruleId: rule.id,
                        type: rule.strictness,
                        description: violationText(rule: rule, students: students),
                        targetStudentId: rule.targetId,
                        targetElementId: desk.id
                    )
                )
            }
        }

        for (deskId, studentId) in assignments {
            guard let student = students.first(where: { $0.id == studentId }), let desk = desksById[deskId] else { continue }
            score += needBonus(student: student, desk: desk, layout: layout, profile: profile)
        }

        return (score, violations)
    }

    private static func orderStudents(_ students: [Student], profile: SolverProfile) -> [Student] {
        switch profile {
        case .balanced:
            students.sorted { $0.name < $1.name }
        case .focus:
            students.sorted {
                if $0.specialNeeds.count == $1.specialNeeds.count { return $0.name < $1.name }
                return $0.specialNeeds.count > $1.specialNeeds.count
            }
        case .friendship:
            students.shuffled()
        }
    }

    private static func passes(rule: Rule, desk: ClassroomElement, targetDesk: ClassroomElement?, layout: ClassroomLayout) -> Bool {
        switch rule.type {
        case .beside:
            guard let targetDesk else { return false }
            return distance(desk, targetDesk) <= 1.1
        case .notBeside:
            guard let targetDesk else { return true }
            return distance(desk, targetDesk) > 1.1
        case .near:
            guard let targetDesk else { return false }
            return distance(desk, targetDesk) <= 2.5
        case .far:
            guard let targetDesk else { return true }
            return distance(desk, targetDesk) >= 3
        case .front:
            return desk.y <= 5
        case .back:
            return desk.y >= 7
        case .edge:
            return desk.x <= 2 || desk.x >= layout.width - 3
        case .nearDoor:
            return nearestDistance(from: desk, to: layout.elements.filter { $0.type == .door }) <= 3
        case .nearBoard:
            return nearestDistance(from: desk, to: layout.elements.filter { $0.type == .board }) <= 5
        case .notWindow:
            return nearestDistance(from: desk, to: layout.elements.filter { $0.type == .window }) > 2
        }
    }

    private static func needBonus(student: Student, desk: ClassroomElement, layout: ClassroomLayout, profile: SolverProfile) -> Int {
        var bonus = 0
        if student.specialNeeds.contains(.visual), desk.y <= 5 { bonus += profile == .focus ? 45 : 25 }
        if student.specialNeeds.contains(.hearing), nearestDistance(from: desk, to: layout.elements.filter { $0.type == .board }) <= 5 { bonus += profile == .focus ? 35 : 20 }
        if student.specialNeeds.contains(.focus), nearestDistance(from: desk, to: layout.elements.filter { $0.type == .window || $0.type == .door }) > 2 { bonus += 25 }
        if student.specialNeeds.contains(.accessibility), desk.x <= 2 || desk.x >= layout.width - 3 { bonus += 30 }
        if student.specialNeeds.contains(.behavior), profile == .balanced { bonus += 8 }
        return bonus
    }

    private static func distance(_ lhs: ClassroomElement, _ rhs: ClassroomElement) -> Double {
        let dx = Double(lhs.x - rhs.x)
        let dy = Double(lhs.y - rhs.y)
        return (dx * dx + dy * dy).squareRoot()
    }

    private static func nearestDistance(from desk: ClassroomElement, to elements: [ClassroomElement]) -> Double {
        guard !elements.isEmpty else { return .greatestFiniteMagnitude }
        return elements.map { distance(desk, $0) }.min() ?? .greatestFiniteMagnitude
    }

    private static func violationText(rule: Rule, students: [Student]) -> String {
        let student = students.first { $0.id == rule.studentId }?.name ?? "Schüler"
        let target = rule.targetId.flatMap { id in students.first { $0.id == id }?.name }
        switch rule.type {
        case .beside: return "\(student) sitzt nicht neben \(target ?? "dem Ziel")."
        case .notBeside: return "\(student) sitzt neben \(target ?? "dem Ziel")."
        case .near: return "\(student) sitzt nicht nah genug bei \(target ?? "dem Ziel")."
        case .far: return "\(student) sitzt zu nah bei \(target ?? "dem Ziel")."
        case .front: return "\(student) sitzt nicht vorne."
        case .back: return "\(student) sitzt nicht hinten."
        case .edge: return "\(student) sitzt nicht am Rand."
        case .nearDoor: return "\(student) sitzt nicht nahe der Tür."
        case .nearBoard: return "\(student) sitzt nicht nahe der Tafel."
        case .notWindow: return "\(student) sitzt am Fenster."
        }
    }

    private static func explanation(for profile: SolverProfile, result: (score: Int, violations: [SeatingViolation])) -> String {
        let base: String
        switch profile {
        case .balanced: base = "Balanciert harte Regeln, Förderbedarf und gleichmäßige Verteilung."
        case .focus: base = "Priorisiert Seh-, Hör-, Konzentrations- und Barrierefreiheitsbedarf."
        case .friendship: base = "Variante mit stärkerer sozialer Durchmischung und weichen Regeln."
        }
        return "\(base) Score: \(result.score), Konflikte: \(result.violations.count)."
    }
}
