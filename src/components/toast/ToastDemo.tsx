"use client";

import React from 'react';
import { useToast, useSuccessToast, useErrorToast, useWarningToast, useInfoToast } from '@/components/toast';

export function ToastDemo() {
  const { addToast } = useToast();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const warningToast = useWarningToast();
  const infoToast = useInfoToast();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Toast Notification Demo</h2>
      <div className="space-y-2">
        <button
          onClick={() => successToast('This is a success message!')}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Show Success Toast
        </button>
        <button
          onClick={() => errorToast('This is an error message!')}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Show Error Toast
        </button>
        <button
          onClick={() => warningToast('This is a warning message!')}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        >
          Show Warning Toast
        </button>
        <button
          onClick={() => infoToast('This is an info message!')}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Show Info Toast
        </button>
        <button
          onClick={() => addToast('This is a custom toast!', 'info', 5000)}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
        >
          Show Custom Toast (5s)
        </button>
      </div>
    </div>
  );
}