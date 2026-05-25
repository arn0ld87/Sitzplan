import { describe, expect, it } from 'vitest';
import { getKeyboardAction, isEditableTarget } from './editorKeymap';

function ev(partial: Partial<KeyboardEvent> & { key: string }) {
  return {
    key: partial.key,
    shiftKey: partial.shiftKey ?? false,
    metaKey: partial.metaKey ?? false,
    ctrlKey: partial.ctrlKey ?? false,
    altKey: partial.altKey ?? false
  };
}

describe('getKeyboardAction', () => {
  it('Cmd+Z → undo', () => {
    expect(getKeyboardAction(ev({ key: 'z', metaKey: true }))).toEqual({ type: 'undo' });
    expect(getKeyboardAction(ev({ key: 'Z', ctrlKey: true }))).toEqual({ type: 'undo' });
  });

  it('Cmd+Shift+Z → redo', () => {
    expect(getKeyboardAction(ev({ key: 'z', metaKey: true, shiftKey: true })))
      .toEqual({ type: 'redo' });
  });

  it('Ctrl+Y → redo (Windows convention)', () => {
    expect(getKeyboardAction(ev({ key: 'y', ctrlKey: true }))).toEqual({ type: 'redo' });
  });

  it('Arrow keys → move', () => {
    expect(getKeyboardAction(ev({ key: 'ArrowLeft' }))).toEqual({ type: 'move', dx: -1, dy: 0 });
    expect(getKeyboardAction(ev({ key: 'ArrowRight' }))).toEqual({ type: 'move', dx: 1, dy: 0 });
    expect(getKeyboardAction(ev({ key: 'ArrowUp' }))).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(getKeyboardAction(ev({ key: 'ArrowDown' }))).toEqual({ type: 'move', dx: 0, dy: 1 });
  });

  it('Delete/Backspace → delete', () => {
    expect(getKeyboardAction(ev({ key: 'Delete' }))).toEqual({ type: 'delete' });
    expect(getKeyboardAction(ev({ key: 'Backspace' }))).toEqual({ type: 'delete' });
  });

  it('Escape → deselect', () => {
    expect(getKeyboardAction(ev({ key: 'Escape' }))).toEqual({ type: 'deselect' });
  });

  it('R → rotate', () => {
    expect(getKeyboardAction(ev({ key: 'r' }))).toEqual({ type: 'rotate' });
    expect(getKeyboardAction(ev({ key: 'R' }))).toEqual({ type: 'rotate' });
  });

  it('ignores arrows with modifiers', () => {
    expect(getKeyboardAction(ev({ key: 'ArrowLeft', metaKey: true }))).toBeNull();
    expect(getKeyboardAction(ev({ key: 'ArrowLeft', altKey: true }))).toBeNull();
  });

  it('returns null for unknown keys', () => {
    expect(getKeyboardAction(ev({ key: 'a' }))).toBeNull();
    expect(getKeyboardAction(ev({ key: 'Enter' }))).toBeNull();
  });
});

describe('isEditableTarget', () => {
  it('detects INPUT, TEXTAREA, SELECT', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(select)).toBe(true);
  });

  it('detects contenteditable', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    expect(isEditableTarget(div)).toBe(true);
    document.body.removeChild(div);
  });

  it('rejects non-editable elements', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
