import { create } from 'zustand';

interface SelectionState {
  keys: Set<string>;
  activePreset: string | null;
  toggle: (key: string) => void;
  setMany: (keys: string[], opts?: { preset?: string | null }) => void;
  toggleMany: (keys: string[], on: boolean) => void;
  clear: () => void;
  has: (key: string) => boolean;
  size: () => number;
}

export const useSelection = create<SelectionState>((set, get) => ({
  keys: new Set<string>(),
  activePreset: null,
  toggle: (key) =>
    set((s) => {
      const next = new Set(s.keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { keys: next, activePreset: null };
    }),
  setMany: (keys, opts) =>
    set(() => ({
      keys: new Set(keys),
      activePreset: opts?.preset ?? null,
    })),
  toggleMany: (keys, on) =>
    set((s) => {
      const next = new Set(s.keys);
      if (on) keys.forEach((k) => next.add(k));
      else keys.forEach((k) => next.delete(k));
      return { keys: next, activePreset: null };
    }),
  clear: () => set({ keys: new Set(), activePreset: null }),
  has: (key) => get().keys.has(key),
  size: () => get().keys.size,
}));
