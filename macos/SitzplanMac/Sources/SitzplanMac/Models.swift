import Foundation

enum SpecialNeed: String, CaseIterable, Codable, Identifiable {
    case visual = "Sehschwäche"
    case hearing = "Hörschwäche"
    case focus = "Konzentrationsbedarf"
    case behavior = "Verhalten"
    case accessibility = "Barrierefreiheit"

    var id: String { rawValue }
}

struct Student: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var specialNeeds: [SpecialNeed]
}

enum RuleType: String, CaseIterable, Codable, Identifiable {
    case beside
    case notBeside
    case near
    case far
    case front
    case back
    case edge
    case nearDoor
    case nearBoard
    case notWindow

    var id: String { rawValue }

    var label: String {
        switch self {
        case .beside: "darf neben Ziel sitzen"
        case .notBeside: "darf nicht neben Ziel sitzen"
        case .near: "soll nahe bei Ziel sitzen"
        case .far: "soll weit weg von Ziel sitzen"
        case .front: "soll vorne sitzen"
        case .back: "soll hinten sitzen"
        case .edge: "soll am Rand sitzen"
        case .nearDoor: "soll nahe der Tür sitzen"
        case .nearBoard: "soll nahe der Tafel sitzen"
        case .notWindow: "soll nicht am Fenster sitzen"
        }
    }
}

enum Strictness: String, CaseIterable, Codable, Identifiable {
    case hard
    case soft

    var id: String { rawValue }
    var label: String { self == .hard ? "hart" : "weich" }
}

struct Rule: Identifiable, Codable, Hashable {
    var id: UUID
    var studentId: UUID
    var type: RuleType
    var targetId: UUID?
    var strictness: Strictness
}

enum ElementType: String, Codable {
    case desk
    case board
    case window
    case door
    case cupboard
    case furniture
}

struct ClassroomElement: Identifiable, Codable, Hashable {
    var id: String
    var type: ElementType
    var x: Int
    var y: Int
    var w: Int
    var h: Int
    var rotation: Int
    var label: String?
}

struct ClassroomLayout: Codable, Hashable {
    var width: Int
    var height: Int
    var elements: [ClassroomElement]
}

struct SeatingViolation: Identifiable, Codable, Hashable {
    var id: UUID
    var studentId: UUID
    var ruleId: UUID?
    var type: Strictness
    var description: String
    var targetStudentId: UUID?
    var targetElementId: String?
}

struct SeatingProposal: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var assignments: [String: UUID]
    var score: Int
    var violations: [SeatingViolation]
    var explanation: String
}

struct SchoolClass: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var students: [Student]
    var rules: [Rule]
}

enum AppSection: String, CaseIterable, Identifiable {
    case dashboard = "Übersicht"
    case students = "Schüler"
    case rules = "Regeln"
    case room = "Raum"
    case generator = "Generator"

    var id: String { rawValue }
}

enum SolverProfile: String, CaseIterable {
    case balanced
    case focus
    case friendship

    var title: String {
        switch self {
        case .balanced: "Vorschlag A: Ausgewogen"
        case .focus: "Vorschlag B: Förderbedarf"
        case .friendship: "Vorschlag C: Sozial"
        }
    }
}
