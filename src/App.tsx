import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Grid,
  Sparkles,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import type { SchoolClass, ClassroomLayout, Student, Rule, SpecialNeed } from './types';
import { Dashboard } from './components/Dashboard';
import { StudentMgmt } from './components/StudentMgmt';
import { RuleMgmt } from './components/RuleMgmt';
import { RoomEditor } from './components/RoomEditor';
import { Generator } from './components/Generator';
import { MOCK_CLASS, MOCK_CLASSROOM_LAYOUT } from './utils/mockData';
import { loadClasses, loadLayout, saveClasses, saveLayout } from './utils/storage';
import { newId } from './utils/ids';
import { cleanRulesForDeletedStudent } from './utils/cleanup';
import './index.css';

const DEFAULT_LAYOUT: ClassroomLayout = {
  width: 12,
  height: 10,
  elements: []
};

// Single initial-load snapshot. Hoisted out of the component so the I/O
// happens exactly once per module evaluation, instead of N times across
// useState initializers.
const INITIAL_CLASSES = loadClasses();
const INITIAL_LAYOUT = loadLayout();

// If either side has a future schema version, the app must NOT write back —
// otherwise mutation would overwrite the future-version payload with an
// older-version one. UI surfaces this via a read-only banner.
const STORAGE_READ_ONLY =
  INITIAL_CLASSES.status === 'unsupported-version' ||
  INITIAL_LAYOUT.status === 'unsupported-version';

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="brand-mark"
    />
  );
}

function App() {
  const [classes, setClasses] = useState<SchoolClass[]>(INITIAL_CLASSES.data);
  const [activeClassId, setActiveClassId] = useState<string>(
    INITIAL_CLASSES.data.length > 0 ? INITIAL_CLASSES.data[0].id : ''
  );
  const [layout, setLayout] = useState<ClassroomLayout>(
    INITIAL_LAYOUT.data ?? DEFAULT_LAYOUT
  );
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'rules' | 'room' | 'generator'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('sitzplaner_theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return 'light';
  });

  // Apply data-theme attribute whenever theme changes (covers initial + toggle).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist classes only after user mutation, and only when not in read-only
  // mode (read-only protects future-schema data from being overwritten).
  const classesMutatedRef = useRef(false);
  useEffect(() => {
    if (!classesMutatedRef.current) {
      classesMutatedRef.current = true;
      return;
    }
    if (STORAGE_READ_ONLY) return;
    saveClasses(classes);
  }, [classes]);

  // Persist layout: same gating.
  const layoutMutatedRef = useRef(false);
  useEffect(() => {
    if (!layoutMutatedRef.current) {
      layoutMutatedRef.current = true;
      return;
    }
    if (STORAGE_READ_ONLY) return;
    saveLayout(layout);
  }, [layout]);

  // Theme Toggler — data-theme attribute is synced by the useEffect above.
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('sitzplaner_theme', nextTheme);
  };

  // Example Preloader Logic
  const handleLoadExampleClass = () => {
    const hasExisting = classes.some((c) => c.id === MOCK_CLASS.id);
    const updatedClasses = hasExisting
      ? classes.map((c) => (c.id === MOCK_CLASS.id ? MOCK_CLASS : c))
      : [MOCK_CLASS, ...classes];

    setClasses(updatedClasses);
    setLayout(MOCK_CLASSROOM_LAYOUT);
    setActiveClassId(MOCK_CLASS.id);

    // Direct user to generator view to see the magic immediately
    setActiveTab('generator');
  };

  // Create new Class
  const handleCreateClass = (name: string) => {
    const newClass: SchoolClass = {
      id: newId('class'),
      name,
      students: [],
      rules: []
    };
    const updated = [...classes, newClass];
    setClasses(updated);
    setActiveClassId(newClass.id);
  };

  // Delete Class
  const handleDeleteClass = (id: string) => {
    const updated = classes.filter((c) => c.id !== id);
    setClasses(updated);
    if (activeClassId === id) {
      setActiveClassId(updated.length > 0 ? updated[0].id : '');
    }
  };

  // Add Student to Active Class
  const handleAddStudent = (name: string, specialNeeds: SpecialNeed[]) => {
    if (!activeClassId) return;

    const newStudent: Student = {
      id: newId('student'),
      name,
      specialNeeds
    };

    const updatedClasses = classes.map((c) => {
      if (c.id === activeClassId) {
        return {
          ...c,
          students: [...c.students, newStudent]
        };
      }
      return c;
    });

    setClasses(updatedClasses);
  };

  // Update Student in Active Class
  const handleUpdateStudent = (id: string, name: string, specialNeeds: SpecialNeed[]) => {
    if (!activeClassId) return;

    const updatedClasses = classes.map((c) => {
      if (c.id === activeClassId) {
        return {
          ...c,
          students: c.students.map((s) =>
            s.id === id ? { ...s, name, specialNeeds } : s
          )
        };
      }
      return c;
    });

    setClasses(updatedClasses);
  };

  // Delete Student from Active Class & clean relations rules
  const handleDeleteStudent = (studentId: string) => {
    if (!activeClassId) return;

    const updatedClasses = classes.map((c) => {
      if (c.id === activeClassId) {
        return {
          ...c,
          students: c.students.filter((s) => s.id !== studentId),
          // filter out dangling rules referencing deleted student
          rules: cleanRulesForDeletedStudent(c.rules, studentId)
        };
      }
      return c;
    });

    setClasses(updatedClasses);
  };

  // Add Custom Rule
  const handleAddRule = (rule: Omit<Rule, 'id'>) => {
    if (!activeClassId) return;

    const newRule: Rule = {
      ...rule,
      id: newId('rule')
    };

    const updatedClasses = classes.map((c) => {
      if (c.id === activeClassId) {
        return {
          ...c,
          rules: [...c.rules, newRule]
        };
      }
      return c;
    });

    setClasses(updatedClasses);
  };

  // Delete Custom Rule
  const handleDeleteRule = (ruleId: string) => {
    if (!activeClassId) return;

    const updatedClasses = classes.map((c) => {
      if (c.id === activeClassId) {
        return {
          ...c,
          rules: c.rules.filter((r) => r.id !== ruleId)
        };
      }
      return c;
    });

    setClasses(updatedClasses);
  };

  // Update Seating Layout
  const handleUpdateLayout = (newLayout: ClassroomLayout) => {
    setLayout(newLayout);
  };

  // Import JSON File
  const handleImportData = (data: { classes: SchoolClass[]; layout: ClassroomLayout }) => {
    setClasses(data.classes);
    setLayout(data.layout);
    if (data.classes.length > 0) {
      setActiveClassId(data.classes[0].id);
    }
  };

  // Export JSON File
  const handleExportData = () => {
    const dataStr = JSON.stringify({ classes, layout }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'pultpilot_daten_backup.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const activeClass = classes.find((c) => c.id === activeClassId);

  type NavId = typeof activeTab;
  type NavItem = {
    id: NavId;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    count?: number;
  };
  type NavGroup = { title: string; items: NavItem[] };

  const studentCount = activeClass?.students.length ?? 0;
  const ruleCount = activeClass?.rules.length ?? 0;

  const NAV_GROUPS: NavGroup[] = [
    {
      title: 'Überblick',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Planung',
      items: [
        { id: 'students', label: 'Schülerliste', icon: Users, count: studentCount },
        { id: 'rules',    label: 'Sitzregeln',  icon: SlidersHorizontal, count: ruleCount },
      ],
    },
    {
      title: 'Raum & Sitzplan',
      items: [
        { id: 'room',      label: 'Raumeditor', icon: Grid },
        { id: 'generator', label: 'Generator',  icon: Sparkles },
      ],
    },
  ];

  const TITLES: Record<NavId, { title: string; sub: string }> = {
    dashboard: { title: 'Dashboard',          sub: 'Überblick & Klassenverwaltung' },
    students:  { title: 'Schülerliste',       sub: studentCount === 1 ? '1 Schüler' : `${studentCount} Schüler` },
    rules:     { title: 'Sitzregeln',         sub: ruleCount === 1 ? '1 aktive Regel' : `${ruleCount} aktive Regeln` },
    room:      { title: 'Raumeditor',         sub: 'Klassenzimmer-Grundriss bearbeiten' },
    generator: { title: 'Sitzplan-Generator', sub: 'Vorschläge berechnen und anwenden' },
  };
  const current = TITLES[activeTab];

  return (
    <div className="app-container">
      {/* Sidebar Rail */}
      <nav className="nav-tabs" aria-label="Hauptnavigation">
        <div className="brand">
          <BrandMark size={22} />
          <span className="brand-wordmark">
            Pult<span className="accent">Pilot</span>
          </span>
        </div>

        {activeClass && (
          <button
            type="button"
            className="class-switch"
            onClick={() => setActiveTab('dashboard')}
            aria-label="Klasse wechseln"
          >
            <span className="cs-main">
              <span className="cs-label">Aktive Klasse</span>
              <span className="cs-name">
                {activeClass.name} · {studentCount} {studentCount === 1 ? 'Schüler' : 'Schüler'}
              </span>
            </span>
            <ChevronDown size={14} className="cs-chev" />
          </button>
        )}

        <div className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="sidebar-section" key={group.title}>
              <div className="sidebar-section-title">{group.title}</div>
              {group.items.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {count != null && <span className="ni-count">{count}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-foot">
          <button
            type="button"
            className="tab-btn"
            onClick={toggleTheme}
            aria-label="Farbschema umschalten"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Hell' : 'Dunkel'}</span>
          </button>
          <div className="foot-row">
            <span className="legal">
              <a href="#" onClick={(e) => e.preventDefault()}>Impressum</a>
              <span className="sep">·</span>
              <a href="#" onClick={(e) => e.preventDefault()}>Datenschutz</a>
            </span>
            <span className="version">v0.4</span>
          </div>
        </div>
      </nav>

      {/* Topbar */}
      <header className="app-header">
        <div className="topbar-title">
          <h1 className="topbar-headline">{current.title}</h1>
          <span className="topbar-eyebrow">{current.sub}</span>
        </div>

        <div className="header-actions">
          <span className="autosave-badge" title="Daten werden lokal gespeichert">
            Auto-Speichern
          </span>
        </div>
      </header>

      {STORAGE_READ_ONLY && (
        <div
          role="alert"
          style={{
            margin: '0.75rem 1rem 0',
            padding: '0.75rem 1rem',
            border: '1px solid var(--danger, #d33)',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--danger-light, rgba(221, 51, 51, 0.08))',
            color: 'var(--ink, inherit)',
            fontSize: '0.9rem'
          }}
        >
          <strong>Schreibgeschützter Modus.</strong> Im Browser-Speicher liegen
          Daten in einem neueren Schema-Format, als diese App-Version versteht.
          Speichern ist deaktiviert, damit die neueren Daten nicht überschrieben
          werden. Bitte App-Version aktualisieren oder eine ältere Browser-Session
          verwenden.
        </div>
      )}

      {/* Main Panel Content */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard
            classes={classes}
            activeClassId={activeClassId}
            setActiveClassId={setActiveClassId}
            layout={layout}
            onLoadExampleClass={handleLoadExampleClass}
            onImportData={handleImportData}
            onExportData={handleExportData}
            onCreateClass={handleCreateClass}
            onDeleteClass={handleDeleteClass}
          />
        )}

        {activeTab === 'students' && (
          <StudentMgmt
            activeClass={activeClass}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {activeTab === 'rules' && (
          <RuleMgmt
            activeClass={activeClass}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeTab === 'room' && (
          <RoomEditor
            layout={layout}
            onUpdateLayout={handleUpdateLayout}
          />
        )}

        {activeTab === 'generator' && activeClass && (
          <Generator
            students={activeClass.students}
            rules={activeClass.rules}
            layout={layout}
            onUpdateRules={(newRules) => {
              const updated = classes.map((c) =>
                c.id === activeClassId ? { ...c, rules: newRules } : c
              );
              setClasses(updated);
            }}
            onUpdateStudents={(newStudents) => {
              const updated = classes.map((c) =>
                c.id === activeClassId ? { ...c, students: newStudents } : c
              );
              setClasses(updated);
            }}
            activeClassName={activeClass.name}
          />
        )}
      </main>
    </div>
  );
}

export default App;
