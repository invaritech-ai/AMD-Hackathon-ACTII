import { create } from "zustand";

interface UIState {
  selectedDiscrepancyId: string | null;
  sidebarCollapsed: boolean;
  setSelectedDiscrepancyId: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDiscrepancyId: null,
  sidebarCollapsed: false,
  setSelectedDiscrepancyId: (id) => set({ selectedDiscrepancyId: id }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
