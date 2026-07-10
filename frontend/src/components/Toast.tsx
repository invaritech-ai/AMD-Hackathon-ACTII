import { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@claims/ui";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: "border-[rgb(16_185_129_/_0.3)] bg-[rgb(16_185_129_/_0.1)] text-[var(--color-success)]",
  error: "border-[rgb(239_68_68_/_0.3)] bg-[rgb(239_68_68_/_0.1)] text-[var(--color-destructive)]",
  info: "border-[rgb(139_92_246_/_0.3)] bg-[rgb(139_92_246_/_0.1)] text-[var(--color-accent)]",
};

function ToastItem({ toast, onRemove }: ToastProps) {
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 border px-4 py-3 shadow-lg",
        toastColors[toast.type]
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-1 opacity-80">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 hover:opacity-60 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
