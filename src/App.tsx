import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Grid,
  Sparkles,
  Sun,
  Moon
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
import './index.css';

const DEFAULT_LAYOUT: ClassroomLayout = {
  width: 12,
  height: 10,
  elements: []
};

function App() {
  const [classes, setClasses] = useState<SchoolClass[]>(() => loadClasses());
  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const initial = loadClasses();
    return initial.length > 0 ? initial[0].id : '';
  });
  const [layout, setLayout] = useState<ClassroomLayout>(() => loadLayout() ?? DEFAULT_LAYOUT);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'rules' | 'room' | 'generator'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme: initial load (separate from versioned storage — cosmetic, no data-loss risk)
  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const savedTheme = localStorage.getItem('sitzplaner_theme') as 'light' | 'dark' | null;

    const activeTheme = savedTheme || systemTheme;
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, []);

  // Persist classes only after user mutation (skip initial mount to avoid
  // overwriting existing data when load returned an empty default due to
  // unsupported schema version or invalid payload).
  const classesMutatedRef = useRef(false);
  useEffect(() => {
    if (!classesMutatedRef.current) {
      classesMutatedRef.current = true;
      return;
    }
    saveClasses(classes);
  }, [classes]);

  // Persist layout: same skip-first-mount safeguard.
  const layoutMutatedRef = useRef(false);
  useEffect(() => {
    if (!layoutMutatedRef.current) {
      layoutMutatedRef.current = true;
      return;
    }
    saveLayout(layout);
  }, [layout]);

  // Theme Toggler
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('sitzplaner_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Example Preloader Logic
  const handleLoadExampleClass = () => {
    const hasExisting = classes.some((c) => c.id === MOCK_CLASS.id);
    let updatedClasses = [...classes];

    if (!hasExisting) {
      updatedClasses = [MOCK_CLASS, ...classes];
    } else {
      updatedClasses = classes.map((c) => (c.id === MOCK_CLASS.id ? MOCK_CLASS : c));
    }

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
          rules: c.rules.filter((r) => r.studentId !== studentId && r.targetId !== studentId)
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

    const exportFileDefaultName = 'sitzplaner_daten_backup.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const activeClass = classes.find((c) => c.id === activeClassId);

  const TABS: { id: typeof activeTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'students',  label: 'Schülerliste',       icon: Users },
    { id: 'rules',     label: 'Sitzregeln',         icon: SlidersHorizontal },
    { id: 'room',      label: 'Raumeditor',         icon: Grid },
    { id: 'generator', label: 'Sitzplan-Generator', icon: Sparkles },
  ];
  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="app-container">
      {/* Sidebar Rail */}
      <nav className="nav-tabs" aria-label="Hauptnavigation">
        <div className="brand">
          <Sparkles size={20} />
          <span>Sitzplaner</span>
        </div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Frosted Topbar */}
      <header className="app-header">
        <div className="topbar-title">
          <span className="topbar-eyebrow">
            {activeClass ? activeClass.name : 'Keine Klasse ausgewählt'}
          </span>
          <h1 className="topbar-headline">{currentTab?.label}</h1>
        </div>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Farbschema umschalten">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

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
