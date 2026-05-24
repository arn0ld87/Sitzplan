import Foundation

enum SampleData {
    static let studentIds = (1...24).reduce(into: [Int: UUID]()) { result, value in
        result[value] = UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", value))!
    }

    static let students: [Student] = [
        Student(id: studentIds[1]!, name: "Jonas Müller", specialNeeds: [.behavior]),
        Student(id: studentIds[2]!, name: "Robin Schmidt", specialNeeds: [.behavior]),
        Student(id: studentIds[3]!, name: "Marie Fischer", specialNeeds: [.visual]),
        Student(id: studentIds[4]!, name: "Lars Weber", specialNeeds: [.hearing]),
        Student(id: studentIds[5]!, name: "Mia Wagner", specialNeeds: [.focus]),
        Student(id: studentIds[6]!, name: "Felix Becker", specialNeeds: [.accessibility]),
        Student(id: studentIds[7]!, name: "Anna Schneider", specialNeeds: []),
        Student(id: studentIds[8]!, name: "Ben Hoffmann", specialNeeds: []),
        Student(id: studentIds[9]!, name: "David Bauer", specialNeeds: []),
        Student(id: studentIds[10]!, name: "Elias Richter", specialNeeds: []),
        Student(id: studentIds[11]!, name: "Emily Wolf", specialNeeds: []),
        Student(id: studentIds[12]!, name: "Hannah Schulz", specialNeeds: []),
        Student(id: studentIds[13]!, name: "Jacob Krause", specialNeeds: []),
        Student(id: studentIds[14]!, name: "Julia Meier", specialNeeds: []),
        Student(id: studentIds[15]!, name: "Laura Köhler", specialNeeds: []),
        Student(id: studentIds[16]!, name: "Lea Frank", specialNeeds: []),
        Student(id: studentIds[17]!, name: "Leon Kaiser", specialNeeds: []),
        Student(id: studentIds[18]!, name: "Lina Berger", specialNeeds: []),
        Student(id: studentIds[19]!, name: "Lukas Arnold", specialNeeds: []),
        Student(id: studentIds[20]!, name: "Noah Graf", specialNeeds: []),
        Student(id: studentIds[21]!, name: "Paul Haas", specialNeeds: []),
        Student(id: studentIds[22]!, name: "Sarah Peters", specialNeeds: []),
        Student(id: studentIds[23]!, name: "Sophia Lenz", specialNeeds: []),
        Student(id: studentIds[24]!, name: "Tim Keller", specialNeeds: [])
    ]

    static let rules: [Rule] = [
        Rule(id: UUID(), studentId: studentIds[1]!, type: .notBeside, targetId: studentIds[2]!, strictness: .hard),
        Rule(id: UUID(), studentId: studentIds[7]!, type: .beside, targetId: studentIds[9]!, strictness: .soft),
        Rule(id: UUID(), studentId: studentIds[10]!, type: .beside, targetId: studentIds[11]!, strictness: .soft),
        Rule(id: UUID(), studentId: studentIds[3]!, type: .front, targetId: nil, strictness: .soft),
        Rule(id: UUID(), studentId: studentIds[4]!, type: .nearBoard, targetId: nil, strictness: .soft),
        Rule(id: UUID(), studentId: studentIds[5]!, type: .far, targetId: studentIds[14]!, strictness: .soft)
    ]

    static let layout = ClassroomLayout(
        width: 12,
        height: 10,
        elements: [
            ClassroomElement(id: "board-1", type: .board, x: 4, y: 0, w: 4, h: 1, rotation: 0, label: "Tafel"),
            ClassroomElement(id: "window-1", type: .window, x: 0, y: 2, w: 1, h: 2, rotation: 90, label: "Fenster"),
            ClassroomElement(id: "window-2", type: .window, x: 0, y: 6, w: 1, h: 2, rotation: 90, label: "Fenster"),
            ClassroomElement(id: "door-1", type: .door, x: 11, y: 8, w: 1, h: 1, rotation: 0, label: "Tür"),
            ClassroomElement(id: "cupboard-1", type: .cupboard, x: 1, y: 9, w: 2, h: 1, rotation: 0, label: "Regal"),
            ClassroomElement(id: "cupboard-2", type: .cupboard, x: 9, y: 9, w: 2, h: 1, rotation: 0, label: "Schrank"),
            ClassroomElement(id: "pult-lehrer", type: .furniture, x: 5, y: 2, w: 2, h: 1, rotation: 180, label: "Lehrerpult")
        ] + desks
    )

    static let exampleClass = SchoolClass(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000800")!,
        name: "Klasse 8b",
        students: students,
        rules: rules
    )

    private static let desks: [ClassroomElement] = {
        var result: [ClassroomElement] = []
        let columns = [(2, "L"), (5, "C"), (8, "R")]
        for (columnIndex, column) in columns.enumerated() {
            for row in 0..<5 {
                for pair in 0..<2 {
                    let number = row * 2 + pair + 1
                    result.append(
                        ClassroomElement(
                            id: "desk-\(column.1.lowercased())\(row + 1)\(pair == 0 ? "a" : "b")",
                            type: .desk,
                            x: column.0 + pair,
                            y: 4 + row,
                            w: 1,
                            h: 1,
                            rotation: 0,
                            label: "Pult \(column.1)\(number)"
                        )
                    )
                }
            }
            _ = columnIndex
        }
        return result
    }()
}
