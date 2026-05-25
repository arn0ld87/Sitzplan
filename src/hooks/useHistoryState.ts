import { useCallback, useState } from 'react';

export interface UseHistoryStateOptions {
  limit?: number;
}

export interface HistoryState<T> {
  value: T;
  set: (next: T | ((prev: T) => T)) => void;
  reset: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  past: number;
  future: number;
}

interface Frame<T> {
  past: T[];
  present: T;
  future: T[];
}

const DEFAULT_LIMIT = 50;

export function useHistoryState<T>(initial: T, opts: UseHistoryStateOptions = {}): HistoryState<T> {
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);

  const [state, setState] = useState<Frame<T>>({ past: [], present: initial, future: [] });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((curr) => {
        const value = typeof next === 'function' ? (next as (p: T) => T)(curr.present) : next;
        if (Object.is(value, curr.present)) return curr;
        const past = [...curr.past, curr.present];
        const trimmed = past.length > limit ? past.slice(past.length - limit) : past;
        return { past: trimmed, present: value, future: [] };
      });
    },
    [limit]
  );

  const reset = useCallback((next: T) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  const undo = useCallback(() => {
    setState((curr) => {
      if (curr.past.length === 0) return curr;
      const prev = curr.past[curr.past.length - 1];
      return {
        past: curr.past.slice(0, -1),
        present: prev,
        future: [curr.present, ...curr.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((curr) => {
      if (curr.future.length === 0) return curr;
      const [next, ...rest] = curr.future;
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: rest
      };
    });
  }, []);

  return {
    value: state.present,
    set,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    past: state.past.length,
    future: state.future.length
  };
}
