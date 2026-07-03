"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer px-6 py-3 rounded-xl shadow-lg border flex items-center justify-between gap-4 text-sm font-bold min-w-[300px] transition-all animate-fade-in ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-600 border-red-200'
                : toast.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : toast.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-white text-primary border-outline/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined notranslate">
                {toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'info'}
              </span>
              <span>{toast.message}</span>
            </div>
            <span className="material-symbols-outlined notranslate text-[18px] opacity-70 hover:opacity-100">close</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
