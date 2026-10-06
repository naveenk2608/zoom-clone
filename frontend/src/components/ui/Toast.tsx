"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const VISIBLE_MS = 3500;

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Shows one short notice at a time, like Zoom's dark toast at the top of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  // An object rather than a string, so showing the same message twice still
  // counts as a change and restarts the timer.
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const showToast = useCallback((message: string) => setToast({ message }), []);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={showToast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      >
        {toast && (
          <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-room-bar px-5 py-3 text-[15px] text-white shadow-lg">
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="rounded text-white/80 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
