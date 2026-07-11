import { create } from "zustand";

export type ProcessingStage =
  | "uploading"
  | "queued"
  | "extracting"
  | "analyzing"
  | "classified"
  | "failed";

export interface ProcessingQueueItem {
  id: string;
  filename: string;
  size: number;
  stage: ProcessingStage;
  progress: number;
  documentId?: string;
  error?: string;
}

interface ProcessingQueueState {
  items: ProcessingQueueItem[];
  addFiles: (files: File[]) => ProcessingQueueItem[];
  updateItem: (id: string, patch: Partial<Omit<ProcessingQueueItem, "id">>) => void;
  dismissItem: (id: string) => void;
}

export const useProcessingQueueStore = create<ProcessingQueueState>((set) => ({
  items: [],
  addFiles: (files) => {
    const items = files.map((file) => ({
      id: crypto.randomUUID(),
      filename: file.name,
      size: file.size,
      stage: "uploading" as const,
      progress: 0,
    }));
    set((state) => ({ items: [...state.items, ...items] }));
    return items;
  },
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  dismissItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));
