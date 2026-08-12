import { css } from "goober";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Alert from "../Alert/Alert";
import type { AlertVariant } from "../Alert/Alert";

export type ToastOptions = {
  variant?: AlertVariant;
  title?: string;
  /** Milliseconds before auto-dismiss. `0` keeps it until dismissed. Default 4000. */
  duration?: number;
};

type Toast = ToastOptions & { id: number; message: string };

export type ToastApi = {
  /** Show a toast. Returns its id so it can be dismissed early. */
  show: (message: string, options?: ToastOptions) => number;
  success: (message: string, options?: Omit<ToastOptions, "variant">) => number;
  error: (message: string, options?: Omit<ToastOptions, "variant">) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export type ToastProviderProps = {
  children: ReactNode;
  /** Corner to stack toasts in. Defaults to `"bottom-right"`. */
  position?: "top-right" | "bottom-right" | "top-center";
};

/** Wrap the app once; call `useToast()` anywhere beneath it. */
export function ToastProvider({ children, position = "bottom-right" }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // Timers are cleared on manual dismiss so a late timeout can't remove a
  // toast that was already replaced by one reusing its slot.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      const duration = options.duration ?? 4000;
      setToasts((prev) => [...prev, { ...options, id, message }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, variant: "success" }),
      error: (message, options) => show(message, { ...options, variant: "error" }),
      dismiss,
    }),
    [show, dismiss]
  );

  const anchor = {
    "top-right": "top: 16px; right: 16px;",
    "bottom-right": "bottom: 16px; right: 16px;",
    "top-center": "top: 16px; left: 50%; transform: translateX(-50%);",
  }[position];

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // aria-live so a screen reader announces toasts without stealing focus.
        aria-live="polite"
        aria-atomic="false"
        className={css`
          position: fixed;
          ${anchor}
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: min(360px, calc(100vw - 32px));
          pointer-events: none;

          & > * {
            pointer-events: auto;
          }
        `}
      >
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            variant={toast.variant ?? "info"}
            title={toast.title}
            onDismiss={() => dismiss(toast.id)}
          >
            {toast.message}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Show toasts. Throws outside a `ToastProvider` so the mistake is loud. */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return context;
}
