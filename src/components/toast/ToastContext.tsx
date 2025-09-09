"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface IToast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: IToast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<IToast[]>([]);

  const addToast = (message: string, type: ToastType, duration: number = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: IToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);
    
    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks for specific toast types
export function useSuccessToast() {
  const { addToast } = useToast();
  return (message: string, duration?: number) => addToast(message, 'success', duration);
}

export function useErrorToast() {
  const { addToast } = useToast();
  return (message: string, duration?: number) => addToast(message, 'error', duration);
}

export function useWarningToast() {
  const { addToast } = useToast();
  return (message: string, duration?: number) => addToast(message, 'warning', duration);
}

export function useInfoToast() {
  const { addToast } = useToast();
  return (message: string, duration?: number) => addToast(message, 'info', duration);
}