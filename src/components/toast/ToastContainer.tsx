"use client";

import React from 'react';
import { useToast } from './ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-xs">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}