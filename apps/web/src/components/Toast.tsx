/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error';
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastValue {
  success(message: string): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = (tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, tone, message }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3600);
  };
  const value = useMemo(() => ({ success: (message: string) => push('success', message), error: (message: string) => push('error', message) }), []);
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((item) => <div key={item.id} className={`toast toast-${item.tone}`}>{item.message}</div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
