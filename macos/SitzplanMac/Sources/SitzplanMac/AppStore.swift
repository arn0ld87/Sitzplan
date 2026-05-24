import Foundation

final class AppStore {
    var classes: [SchoolClass] = []
    var activeClassId: UUID?
    var layout: ClassroomLayout = SampleData.layout
    var proposals: [SeatingProposal] = []
    var activeProposalId: String?

    private let classesKey = "sitzplaner_mac_classes"
    private let layoutKey = "sitzplaner_mac_layout"
    private let activeClassKey = "sitzplaner_mac_active_class"

    var activeClass: SchoolClass? {
        classes.first { $0.id == activeClassId } ?? classes.first
    }

    init() {
        load()
        if classes.isEmpty {
            loadExampleClass()
        }
    }

    func loadExampleClass() {
        if let existing = classes.first(where: { $0.id == SampleData.exampleClass.id }) {
            activeClassId = existing.id
        } else {
            classes.append(SampleData.exampleClass)
            activeClassId = SampleData.exampleClass.id
        }
        layout = SampleData.layout
        generateProposals()
        save()
    }

    func createClass(name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let newClass = SchoolClass(id: UUID(), name: trimmed, students: [], rules: [])
        classes.append(newClass)
        activeClassId = newClass.id
        proposals = []
        save()
    }

    func selectClass(_ id: UUID) {
        activeClassId = id
        proposals = []
        save()
    }

    func addStudent(name: String, needs: [SpecialNeed]) {
        mutateActiveClass { schoolClass in
            schoolClass.students.append(Student(id: UUID(), name: name, specialNeeds: needs))
        }
    }

    func deleteStudents(at offsets: IndexSet) {
        mutateActiveClass { schoolClass in
            let ids = offsets.map { schoolClass.students[$0].id }
            for offset in offsets.sorted(by: >) {
                schoolClass.students.remove(at: offset)
            }
            schoolClass.rules.removeAll { rule in
                ids.contains(rule.studentId) || rule.targetId.map(ids.contains) == true
            }
        }
    }

    func addRule(studentId: UUID, type: RuleType, targetId: UUID?, strictness: Strictness) {
        mutateActiveClass { schoolClass in
            schoolClass.rules.append(Rule(id: UUID(), studentId: studentId, type: type, targetId: targetId, strictness: strictness))
        }
    }

    func deleteRules(at offsets: IndexSet) {
        mutateActiveClass { schoolClass in
            for offset in offsets.sorted(by: >) {
                schoolClass.rules.remove(at: offset)
            }
        }
    }

    func generateProposals() {
        guard let activeClass else { return }
        proposals = SeatingSolver.generateProposals(students: activeClass.students, rules: activeClass.rules, layout: layout)
        activeProposalId = proposals.first?.id
        save()
    }

    func updateAssignment(proposalId: String, deskId: String, studentId: UUID?) {
        guard let proposalIndex = proposals.firstIndex(where: { $0.id == proposalId }) else { return }
        if let studentId {
            proposals[proposalIndex].assignments[deskId] = studentId
        } else {
            proposals[proposalIndex].assignments.removeValue(forKey: deskId)
        }
        if let activeClass {
            let result = SeatingSolver.evaluate(
                assignments: proposals[proposalIndex].assignments,
                students: activeClass.students,
                rules: activeClass.rules,
                layout: layout,
                profile: SolverProfile(rawValue: proposalId) ?? .balanced
            )
            proposals[proposalIndex].score = result.score
            proposals[proposalIndex].violations = result.violations
        }
    }

    private func mutateActiveClass(_ mutation: (inout SchoolClass) -> Void) {
        guard let id = activeClassId ?? classes.first?.id,
              let index = classes.firstIndex(where: { $0.id == id }) else { return }
        mutation(&classes[index])
        proposals = []
        save()
    }

    private func load() {
        let defaults = UserDefaults.standard
        let decoder = JSONDecoder()
        if let data = defaults.data(forKey: classesKey),
           let decoded = try? decoder.decode([SchoolClass].self, from: data) {
            classes = decoded
        }
        if let data = defaults.data(forKey: layoutKey),
           let decoded = try? decoder.decode(ClassroomLayout.self, from: data) {
            layout = decoded
        }
        if let idString = defaults.string(forKey: activeClassKey) {
            activeClassId = UUID(uuidString: idString)
        }
    }

    private func save() {
        let defaults = UserDefaults.standard
        let encoder = JSONEncoder()
        if let data = try? encoder.encode(classes) {
            defaults.set(data, forKey: classesKey)
        }
        if let data = try? encoder.encode(layout) {
            defaults.set(data, forKey: layoutKey)
        }
        defaults.set(activeClassId?.uuidString, forKey: activeClassKey)
    }
}
