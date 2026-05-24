import React, { useState, useRef } from 'react';
import {
  RotateCw,
  Trash2,
  Maximize2,
  Grid,
  Compass,
  Square
} from 'lucide-react';
import type { ClassroomElement, ClassroomLayout, ElementType } from '../types';
import { MOCK_CLASSROOM_LAYOUT } from '../utils/mockData';

interface RoomEditorProps {
  layout: ClassroomLayout;
  onUpdateLayout: (layout: ClassroomLayout) => void;
}

const ELEMENT_CATALOG: { type: ElementType; label: string; w: number; h: number; color: string }[] = [
  { type: 'desk', label: 'Schülerpult (1x1)', w: 1, h: 1, color: 'var(--primary)' },
  { type: 'board', label: 'Tafel (4x1)', w: 4, h: 1, color: '#374151' },
  { type: 'window', label: 'Fenster (2x1)', w: 2, h: 1, color: '#bae6fd' },
  { type: 'door', label: 'Tür (1x1)', w: 1, h: 1, color: '#d97706' },
  { type: 'cupboard', label: 'Schrank (2x1)', w: 2, h: 1, color: '#d1d5db' },
  { type: 'furniture', label: 'Lehrerpult (2x1)', w: 2, h: 1, color: '#e5e7eb' }
];

export const RoomEditor: React.FC<RoomEditorProps> = ({
  layout,
  onUpdateLayout
}) => {
  const [selectedTool, setSelectedTool] = useState<ElementType | 'select'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Drag and drop states
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const cellSize = 50; // pixels per grid cell
  const gridWidth = layout.width * cellSize;
  const gridHeight = layout.height * cellSize;

  const selectedElement = layout.elements.find((el) => el.id === selectedElementId);

  // Layout size controllers
  const handleWidthChange = (val: number) => {
    const newWidth = Math.max(6, Math.min(20, val));
    onUpdateLayout({ ...layout, width: newWidth });
  };

  const handleHeightChange = (val: number) => {
    const newHeight = Math.max(6, Math.min(20, val));
    onUpdateLayout({ ...layout, height: newHeight });
  };

  // Check if position overlaps existing element
  const checkOverlap = (el: Omit<ClassroomElement, 'id'>, ignoreId?: string): boolean => {
    return layout.elements.some((other) => {
      if (other.id === ignoreId) return false;
      
      // Determine bounding boxes considering size w and h
      const elRight = el.x + el.w;
      const elBottom = el.y + el.h;
      const otherRight = other.x + other.w;
      const otherBottom = other.y + other.h;

      return !(
        el.x >= otherRight ||
        elRight <= other.x ||
        el.y >= otherBottom ||
        elBottom <= other.y
      );
    });
  };

  // Add Element on Grid Click
  const handleGridClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || selectedTool === 'select') return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixels to grid coordinates
    const gridX = Math.floor(clickX / cellSize);
    const gridY = Math.floor(clickY / cellSize);

    // Get details of object to place
    const toolDetails = ELEMENT_CATALOG.find((cat) => cat.type === selectedTool);
    if (!toolDetails) return;

    // Check bounds
    if (gridX + toolDetails.w > layout.width || gridY + toolDetails.h > layout.height) {
      alert('Element passt nicht in den Raum!');
      return;
    }

    const newElement: ClassroomElement = {
      id: `${selectedTool}-${Date.now()}`,
      type: selectedTool,
      x: gridX,
      y: gridY,
      w: toolDetails.w,
      h: toolDetails.h,
      rotation: 0,
      label: toolDetails.label.split(' ')[0] // e.g. "Schülerpult"
    };

    if (checkOverlap(newElement)) {
      alert('Dieser Platz ist bereits belegt!');
      return;
    }

    onUpdateLayout({
      ...layout,
      elements: [...layout.elements, newElement]
    });

    // Auto-select placed element and reset tool
    setSelectedElementId(newElement.id);
    setSelectedTool('select');
  };

  // Pointer Down for Dragging
  const handleElementPointerDown = (e: React.PointerEvent<SVGGElement>, el: ClassroomElement) => {
    if (selectedTool !== 'select') return;
    
    e.stopPropagation();
    setSelectedElementId(el.id);
    setDraggingElementId(el.id);

    // Calculate grid coordinate click offset
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const cellX = clickX / cellSize;
    const cellY = clickY / cellSize;
    
    dragStartOffset.current = {
      x: cellX - el.x,
      y: cellY - el.y
    };
    
    // Set pointer capture
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer Move for Dragging
  const handleElementPointerMove = (e: React.PointerEvent<SVGGElement>, elId: string) => {
    if (draggingElementId !== elId || !svgRef.current) return;
    
    e.stopPropagation();
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cellX = clickX / cellSize;
    const cellY = clickY / cellSize;

    // New snap coordinates
    let targetX = Math.round(cellX - dragStartOffset.current.x);
    let targetY = Math.round(cellY - dragStartOffset.current.y);

    const el = layout.elements.find((item) => item.id === elId);
    if (!el) return;

    // Boundary constraints
    targetX = Math.max(0, Math.min(layout.width - el.w, targetX));
    targetY = Math.max(0, Math.min(layout.height - el.h, targetY));

    if (el.x === targetX && el.y === targetY) return;

    // Check overlap at new position
    const proposed = { ...el, x: targetX, y: targetY };
    if (checkOverlap(proposed, el.id)) return;

    // Update coordinate
    const updatedElements = layout.elements.map((item) =>
      item.id === elId ? { ...item, x: targetX, y: targetY } : item
    );

    onUpdateLayout({
      ...layout,
      elements: updatedElements
    });
  };

  // Pointer Up
  const handleElementPointerUp = () => {
    setDraggingElementId(null);
  };

  // Rotate selected element
  const handleRotateSelected = () => {
    if (!selectedElement) return;

    const currentRotation = selectedElement.rotation;
    const nextRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270;

    // Swap width and height if rotated by 90/270 relative to base
    const nextW = selectedElement.h;
    const nextH = selectedElement.w;

    // Check boundaries post rotation
    if (selectedElement.x + nextW > layout.width || selectedElement.y + nextH > layout.height) {
      alert('Element kann an dieser Position nicht gedreht werden. Kein Platz!');
      return;
    }

    const proposed = {
      ...selectedElement,
      w: nextW,
      h: nextH,
      rotation: nextRotation
    };

    if (checkOverlap(proposed, selectedElement.id)) {
      alert('Drehung wird blockiert. Kollision!');
      return;
    }

    onUpdateLayout({
      ...layout,
      elements: layout.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, w: nextW, h: nextH, rotation: nextRotation }
          : el
      )
    });
  };

  // Delete selected element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;

    onUpdateLayout({
      ...layout,
      elements: layout.elements.filter((el) => el.id !== selectedElementId)
    });
    setSelectedElementId(null);
  };

  // Label update selected element
  const handleLabelChange = (newLabel: string) => {
    if (!selectedElementId) return;

    onUpdateLayout({
      ...layout,
      elements: layout.elements.map((el) =>
        el.id === selectedElementId ? { ...el, label: newLabel } : el
      )
    });
  };

  const handleClearLayout = () => {
    if (confirm('Möchtest du den gesamten Raum wirklich leeren? Alle Möbel und Sitzplätze werden gelöscht.')) {
      onUpdateLayout({ ...layout, elements: [] });
      setSelectedElementId(null);
    }
  };

  // Quick preset loader
  const handleLoadStandardDesks = () => {
    if (layout.elements.length > 0) {
      if (!confirm('Das aktuelle Layout wird überschrieben. Fortfahren?')) return;
    }
    
    // Load default layout from mockData
    onUpdateLayout(MOCK_CLASSROOM_LAYOUT);
    setSelectedElementId(null);
  };

  return (
    <div className="room-editor-view">
      <div className="grid-2">
        {/* Editor SVG grid */}
        <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Grid size={20} />
              Klassenzimmer-Grundriss
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleLoadStandardDesks}>
                Standard-Layout laden
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleClearLayout}>
                Alles leeren
              </button>
            </div>
          </div>

          <div className="grid-viewport">
            <svg
              ref={svgRef}
              className="classroom-svg-grid"
              width={gridWidth}
              height={gridHeight}
              viewBox={`0 0 ${gridWidth} ${gridHeight}`}
              onClick={handleGridClick}
            >
              {/* Draw Grid Lines */}
              {Array.from({ length: layout.width + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  className="grid-line"
                  x1={i * cellSize}
                  y1={0}
                  x2={i * cellSize}
                  y2={gridHeight}
                />
              ))}
              {Array.from({ length: layout.height + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  className="grid-line"
                  x1={0}
                  y1={i * cellSize}
                  x2={gridWidth}
                  y2={i * cellSize}
                />
              ))}

              {/* Placed Elements */}
              {layout.elements.map((el) => {
                const isSelected = selectedElementId === el.id;
                const radius = 6;
                const px = el.x * cellSize + 2;
                const py = el.y * cellSize + 2;
                const pw = el.w * cellSize - 4;
                const ph = el.h * cellSize - 4;

                let colorClass = 'svg-furniture';
                if (el.type === 'desk') colorClass = 'svg-desk';
                else if (el.type === 'board') colorClass = 'svg-board';
                else if (el.type === 'window') colorClass = 'svg-window';
                else if (el.type === 'door') colorClass = 'svg-door';
                else if (el.type === 'cupboard') colorClass = 'svg-cupboard';

                return (
                  <g
                    key={el.id}
                    className="classroom-svg-element"
                    onPointerDown={(e) => handlePointerDown(e, el)}
                    onPointerMove={(e) => handlePointerMove(e, el.id)}
                    onPointerUp={handlePointerUp}
                    style={{ touchAction: 'none' }}
                  >
                    {/* Bounding shape */}
                    <rect
                      className={`${colorClass} ${isSelected ? 'selected' : ''}`}
                      x={px}
                      y={py}
                      width={pw}
                      height={ph}
                      rx={radius}
                      style={{ cursor: selectedTool === 'select' ? 'grab' : 'crosshair' }}
                    />
                    
                    {/* Icon specific decorations */}
                    {el.type === 'desk' && (
                      <circle
                        cx={px + pw / 2}
                        cy={py + ph / 2 + 10}
                        r={4}
                        fill="var(--text-muted)"
                        opacity={0.6}
                      />
                    )}

                    {/* Element label text */}
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
              })}
            </svg>
          </div>
        </div>

        {/* Editor Controls & Catalog */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Sizing Card */}
          <div className="card">
            <h3 className="card-title">Raumgröße definieren</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Breite (Spalten)</label>
                <input
                  className="form-input"
                  type="number"
                  value={layout.width}
                  onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                  min={6}
                  max={20}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Tiefe (Reihen)</label>
                <input
                  className="form-input"
                  type="number"
                  value={layout.height}
                  onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                  min={6}
                  max={20}
                />
              </div>
            </div>
          </div>

          {/* Catalog & Placing Card */}
          <div className="card">
            <h3 className="card-title">Objektkatalog</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Wähle ein Element, um es auf dem Gitter zu platzieren. Wähle den Zeiger, um Elemente zu verschieben.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn btn-secondary ${selectedTool === 'select' ? 'btn-primary' : ''}`}
                onClick={() => setSelectedTool('select')}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              >
                <Compass size={16} />
                Zeiger (Verschieben)
              </button>
              {ELEMENT_CATALOG.map((cat) => (
                <button
                  key={cat.type}
                  type="button"
                  className={`btn btn-secondary ${selectedTool === cat.type ? 'btn-primary' : ''}`}
                  onClick={() => {
                    setSelectedTool(cat.type);
                    setSelectedElementId(null);
                  }}
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Square size={12} fill={cat.color} stroke="none" />
                  + {cat.type === 'desk' ? 'Sitzplatz' : cat.type === 'board' ? 'Tafel' : cat.type === 'window' ? 'Fenster' : cat.type === 'door' ? 'Tür' : cat.type === 'cupboard' ? 'Schrank' : 'Möbel'}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Element Management Card */}
          {selectedElement && (
            <div className="card" style={{ animation: 'fadeIn 0.25s', borderLeft: '4px solid var(--secondary)' }}>
              <h3 className="card-title" style={{ fontSize: '1.1rem' }}>
                <Maximize2 size={18} style={{ color: 'var(--secondary)' }} />
                Element bearbeiten
              </h3>

              <div className="form-group">
                <label className="form-label">Bezeichnung / Label</label>
                <input
                  className="form-input"
                  type="text"
                  value={selectedElement.label || ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleRotateSelected} style={{ flex: 1 }}>
                  <RotateCw size={14} />
                  Drehen (90°)
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected} style={{ flex: 1 }}>
                  <Trash2 size={14} />
                  Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Wrapper triggers to bridge React naming to custom Pointer Events seamlessly
  function handlePointerDown(e: React.PointerEvent<SVGGElement>, el: ClassroomElement) {
    handleElementPointerDown(e, el);
  }
  function handlePointerMove(e: React.PointerEvent<SVGGElement>, elId: string) {
    handleElementPointerMove(e, elId);
  }
  function handlePointerUp(_e: React.PointerEvent<SVGGElement>) {
    handleElementPointerUp();
  }
};
