import { useState, useEffect } from 'react';
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
import './index.css';

const LOCAL_STORAGE_KEY_CLASSES = 'sitzplaner_classes';
const LOCAL_STORAGE_KEY_LAYOUT = 'sitzplaner_layout';

function App() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [layout, setLayout] = useState<ClassroomLayout>({
    width: 12,
    height: 10,
    elements: []
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'rules' | 'room' | 'generator'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 1. Initial State Loading from LocalStorage
  useEffect(() => {
    const savedClasses = localStorage.getItem(LOCAL_STORAGE_KEY_CLASSES);
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY_LAYOUT);
    
    // Check system preferred theme
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const savedTheme = localStorage.getItem('sitzplaner_theme') as 'light' | 'dark' | null;
    
    const activeTheme = savedTheme || systemTheme;
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);

    if (savedClasses) {
      try {
        const parsedClasses = JSON.parse(savedClasses);
        setClasses(parsedClasses);
        if (parsedClasses.length > 0) {
          setActiveClassId(parsedClasses[0].id);
        }
      } catch (e) {
        console.error('Fehler beim Laden der Klassen aus LocalStorage', e);
      }
    }

    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Fehler beim Laden des Grundrisses aus LocalStorage', e);
      }
    }
  }, []);

  // Helper: Persist active state to localStorage
  const saveStateToLocalStorage = (updatedClasses: SchoolClass[], updatedLayout: ClassroomLayout) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CLASSES, JSON.stringify(updatedClasses));
    localStorage.setItem(LOCAL_STORAGE_KEY_LAYOUT, JSON.stringify(updatedLayout));
  };

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
    saveStateToLocalStorage(updatedClasses, MOCK_CLASSROOM_LAYOUT);
    
    // Direct user to generator view to see the magic immediately
    setActiveTab('generator');
  };

  // Create new Class
  const handleCreateClass = (name: string) => {
    const newClass: SchoolClass = {
      id: `class-${Date.now()}`,
      name,
      students: [],
      rules: []
    };
    const updated = [...classes, newClass];
    setClasses(updated);
    setActiveClassId(newClass.id);
    saveStateToLocalStorage(updated, layout);
  };

  // Delete Class
  const handleDeleteClass = (id: string) => {
    const updated = classes.filter((c) => c.id !== id);
    setClasses(updated);
    if (activeClassId === id) {
      setActiveClassId(updated.length > 0 ? updated[0].id : '');
    }
    saveStateToLocalStorage(updated, layout);
  };

  // Add Student to Active Class
  const handleAddStudent = (name: string, specialNeeds: SpecialNeed[]) => {
    if (!activeClassId) return;

    const newStudent: Student = {
      id: `student-${Date.now()}`,
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
    saveStateToLocalStorage(updatedClasses, layout);
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
    saveStateToLocalStorage(updatedClasses, layout);
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
    saveStateToLocalStorage(updatedClasses, layout);
  };

  // Add Custom Rule
  const handleAddRule = (rule: Omit<Rule, 'id'>) => {
    if (!activeClassId) return;

    const newRule: Rule = {
      ...rule,
      id: `rule-${Date.now()}`
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
    saveStateToLocalStorage(updatedClasses, layout);
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
    saveStateToLocalStorage(updatedClasses, layout);
  };

  // Update Seating Layout
  const handleUpdateLayout = (newLayout: ClassroomLayout) => {
    setLayout(newLayout);
    saveStateToLocalStorage(classes, newLayout);
  };

  // Import JSON File
  const handleImportData = (data: { classes: SchoolClass[]; layout: ClassroomLayout }) => {
    setClasses(data.classes);
    setLayout(data.layout);
    if (data.classes.length > 0) {
      setActiveClassId(data.classes[0].id);
    }
    saveStateToLocalStorage(data.classes, data.layout);
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
              localStorage.setItem(LOCAL_STORAGE_KEY_CLASSES, JSON.stringify(updated));
            }}
            onUpdateStudents={(newStudents) => {
              const updated = classes.map((c) =>
                c.id === activeClassId ? { ...c, students: newStudents } : c
              );
              setClasses(updated);
              localStorage.setItem(LOCAL_STORAGE_KEY_CLASSES, JSON.stringify(updated));
            }}
            activeClassName={activeClass.name}
          />
        )}
      </main>
    </div>
  );
}

export default App;
