"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { ToastType } from "@/lib/types";

const STYLES: Record<ToastType, { border: string; text: string; icon: React.ReactNode }> = {
  success: { border: "border-emerald-500/40", text: "text-emerald-400", icon: <CheckCircle2 size={18} /> },
  error: { border: "border-red-500/40", text: "text-red-400", icon: <XCircle size={18} /> },
  info: { border: "border-blue-500/40", text: "text-blue-400", icon: <Info size={18} /> },
  warning: { border: "border-amber-500/40", text: "text-amber-400", icon: <AlertTriangle size={18} /> },
};

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => {
        const style = STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={`toast-enter flex items-start gap-3 min-w-[300px] max-w-sm p-4 rounded-xl border ${style.border} bg-[var(--bg-panel)] shadow-2xl`}
          >
            <span className={style.text}>{style.icon}</span>
            <span className="text-sm text-[var(--text-primary)]">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
