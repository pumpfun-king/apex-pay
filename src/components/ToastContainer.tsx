"use client";

import React from "react";
import { useApexStore } from "@/store/useApexStore";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useApexStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2.5 sm:max-w-sm w-auto pointer-events-none">
      {toasts.map((toast) => {
        const iconMap = {
          success: (
            <CheckCircle2 className="w-4 h-4 text-[#FFC700] shrink-0 mt-0.5" />
          ),
          error: (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ),
          warning: (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ),
          info: <Info className="w-4 h-4 text-[#FFC700] shrink-0 mt-0.5" />,
        };

        const borderMap = {
          success: "border-[#FFC700]/40 bg-[#0A0B0E]/95",
          error: "border-rose-500/40 bg-[#0A0B0E]/95",
          warning: "border-amber-500/40 bg-[#0A0B0E]/95",
          info: "border-white/20 bg-[#0A0B0E]/95",
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-200 ${borderMap[toast.variant]}`}
          >
            {iconMap[toast.variant]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 hover:text-white transition-colors p-0.5"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
