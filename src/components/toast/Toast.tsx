"use client";

import React from 'react';
import { Toast as ToastType } from './ToastContext';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const { id, message, type } = toast;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div 
      className={`flex items-center justify-between p-4 mb-2 rounded-lg shadow-lg transform transition-all duration-300 ${getTypeStyles()}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button 
        onClick={() => onClose(id)}
        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}