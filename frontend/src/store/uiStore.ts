import { create } from "zustand";

interface UIState {
  selectedDiscrepancyId: string | null;
  sidebarCollapsed: boolean;
  setSelectedDiscrepancyId: (id: string | null) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDiscrepancyId: null,
  sidebarCollapsed: false,
  setSelectedDiscrepancyId: (id) => set({ selectedDiscrepancyId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
