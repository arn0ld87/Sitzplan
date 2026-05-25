export type EditorAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'delete' }
  | { type: 'deselect' }
  | { type: 'rotate' }
  | { type: 'move'; dx: number; dy: number };

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  const ce = target.getAttribute('contenteditable');
  return ce !== null && ce !== 'false';
}

/** Translate a KeyboardEvent into a logical editor action, or null if unmapped. */
export function getKeyboardAction(e: {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): EditorAction | null {
  const mod = e.metaKey || e.ctrlKey;

  if (mod && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) return { type: 'undo' };
    if ((k === 'z' && e.shiftKey) || k === 'y') return { type: 'redo' };
    return null;
  }

  if (e.altKey || e.metaKey || e.ctrlKey) return null;

  switch (e.key) {
    case 'ArrowUp':    return { type: 'move', dx: 0,  dy: -1 };
    case 'ArrowDown':  return { type: 'move', dx: 0,  dy:  1 };
    case 'ArrowLeft':  return { type: 'move', dx: -1, dy:  0 };
    case 'ArrowRight': return { type: 'move', dx: 1,  dy:  0 };
    case 'Delete':
    case 'Backspace':  return { type: 'delete' };
    case 'Escape':     return { type: 'deselect' };
    case 'r':
    case 'R':          return { type: 'rotate' };
    default:           return null;
  }
}
