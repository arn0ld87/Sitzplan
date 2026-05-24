import AppKit

@main
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let store = AppStore()
    private var window: NSWindow?
    private let detail = NSTextView()
    private let sidebar = NSStackView()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        renderDashboard()
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func buildWindow() {
        let split = NSSplitView()
        split.isVertical = true
        split.dividerStyle = .thin

        sidebar.orientation = .vertical
        sidebar.alignment = .leading
        sidebar.spacing = 8
        sidebar.edgeInsets = NSEdgeInsets(top: 20, left: 16, bottom: 20, right: 16)

        let sidebarView = NSView()
        sidebarView.wantsLayer = true
        sidebarView.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
        sidebarView.addSubview(sidebar)
        sidebar.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            sidebar.topAnchor.constraint(equalTo: sidebarView.topAnchor),
            sidebar.leadingAnchor.constraint(equalTo: sidebarView.leadingAnchor),
            sidebar.trailingAnchor.constraint(equalTo: sidebarView.trailingAnchor)
        ])

        detail.isEditable = false
        detail.isRichText = false
        detail.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        detail.textContainerInset = NSSize(width: 20, height: 20)

        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.documentView = detail

        split.addArrangedSubview(sidebarView)
        split.addArrangedSubview(scroll)
        sidebarView.widthAnchor.constraint(equalToConstant: 220).isActive = true

        addButton("Übersicht", action: #selector(showDashboard))
        addButton("Schüler", action: #selector(showStudents))
        addButton("Regeln", action: #selector(showRules))
        addButton("Raum", action: #selector(showRoom))
        addButton("Generator", action: #selector(showGenerator))
        let separator = NSBox()
        separator.boxType = .separator
        separator.widthAnchor.constraint(equalToConstant: 188).isActive = true
        sidebar.addArrangedSubview(separator)
        addButton("Beispielklasse laden", action: #selector(loadExample))
        addButton("Sitzpläne berechnen", action: #selector(generatePlans))

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1120, height: 720),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window?.title = "Sitzplaner"
        window?.center()
        window?.contentView = split
    }

    private func addButton(_ title: String, action: Selector) {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .rounded
        button.controlSize = .large
        button.widthAnchor.constraint(equalToConstant: 188).isActive = true
        sidebar.addArrangedSubview(button)
    }

    @objc private func showDashboard() { renderDashboard() }
    @objc private func showStudents() { renderStudents() }
    @objc private func showRules() { renderRules() }
    @objc private func showRoom() { renderRoom() }
    @objc private func showGenerator() { renderGenerator() }

    @objc private func loadExample() {
        store.loadExampleClass()
        renderDashboard()
    }

    @objc private func generatePlans() {
        store.generateProposals()
        renderGenerator()
    }

    private func renderDashboard() {
        let schoolClass = store.activeClass
        let desks = store.layout.elements.filter { $0.type == .desk }.count
        detail.string = """
        Übersicht
        =========

        Aktive Klasse: \(schoolClass?.name ?? "Keine Klasse")
        Schüler: \(schoolClass?.students.count ?? 0)
        Regeln: \(schoolClass?.rules.count ?? 0)
        Sitzplätze: \(desks)
        Vorschläge: \(store.proposals.count)

        Diese native macOS-Version speichert Daten lokal in UserDefaults.
        """
    }

    private func renderStudents() {
        let rows = (store.activeClass?.students ?? []).map { student in
            let needs = student.specialNeeds.map(\.rawValue).joined(separator: ", ")
            return "- \(student.name)\(needs.isEmpty ? "" : " · \(needs)")"
        }.joined(separator: "\n")
        detail.string = "Schüler\n=======\n\n\(rows)"
    }

    private func renderRules() {
        let schoolClass = store.activeClass
        let rows = (schoolClass?.rules ?? []).map { rule in
            let student = schoolClass?.students.first { $0.id == rule.studentId }?.name ?? "Unbekannt"
            return "- \(student): \(rule.type.label) · \(rule.strictness.label)"
        }.joined(separator: "\n")
        detail.string = "Regeln\n======\n\n\(rows)"
    }

    private func renderRoom() {
        let rows = store.layout.elements.map { element in
            "- \(element.label ?? element.id): \(element.type.rawValue), x \(element.x), y \(element.y), \(element.w)x\(element.h)"
        }.joined(separator: "\n")
        detail.string = "Raum\n====\n\nRaster: \(store.layout.width) x \(store.layout.height)\n\n\(rows)"
    }

    private func renderGenerator() {
        if store.proposals.isEmpty {
            store.generateProposals()
        }
        let rows = store.proposals.map { proposal in
            let conflicts = proposal.violations.map { "    - \($0.description)" }.joined(separator: "\n")
            return """
            \(proposal.name)
            Score: \(proposal.score)
            \(proposal.explanation)
            Konflikte:
            \(conflicts.isEmpty ? "    keine" : conflicts)
            """
        }.joined(separator: "\n\n")
        detail.string = "Generator\n=========\n\n\(rows)"
    }
}
