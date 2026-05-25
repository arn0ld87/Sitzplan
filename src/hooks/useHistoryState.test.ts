import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHistoryState } from './useHistoryState';

describe('useHistoryState', () => {
  it('starts with the initial value and empty history', () => {
    const { result } = renderHook(() => useHistoryState(0));
    expect(result.current.value).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('set pushes onto past and clears future', () => {
    const { result } = renderHook(() => useHistoryState(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    expect(result.current.value).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo restores previous values in order', () => {
    const { result } = renderHook(() => useHistoryState(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.undo());
    expect(result.current.value).toBe(1);
    act(() => result.current.undo());
    expect(result.current.value).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo replays undone values', () => {
    const { result } = renderHook(() => useHistoryState(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.value).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it('set after undo discards the redo stack', () => {
    const { result } = renderHook(() => useHistoryState(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.undo()); // now at 1
    act(() => result.current.set(9));
    expect(result.current.value).toBe(9);
    expect(result.current.canRedo).toBe(false);
  });

  it('reset wipes both stacks', () => {
    const { result } = renderHook(() => useHistoryState(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.reset(99));
    expect(result.current.value).toBe(99);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('set with same value is a no-op', () => {
    const { result } = renderHook(() => useHistoryState(7));
    act(() => result.current.set(7));
    expect(result.current.canUndo).toBe(false);
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useHistoryState(10));
    act(() => result.current.set((n) => n + 5));
    expect(result.current.value).toBe(15);
  });

  it('respects the configured history limit', () => {
    const { result } = renderHook(() => useHistoryState(0, { limit: 3 }));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.set(4));
    expect(result.current.past).toBe(3);
    act(() => result.current.undo());
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.value).toBe(1);
    expect(result.current.canUndo).toBe(false);
  });
});
