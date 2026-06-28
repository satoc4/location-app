import { create } from "zustand";

import type { ActionRun } from "../domain/types";

type SessionState = {
  activeActionRun: ActionRun | null;
  setActiveActionRun: (actionRun: ActionRun | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  activeActionRun: null,
  setActiveActionRun: (activeActionRun) => set({ activeActionRun })
}));
