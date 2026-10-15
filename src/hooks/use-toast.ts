'use client';

import * as React from 'react';
import type { ToastVariant } from '@/components/ui/toast';

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastState = {
  toasts: ToastData[];
};

type ToastAction =
  | { type: 'ADD'; toast: ToastData }
  | { type: 'REMOVE'; id: string };

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD':
      return { toasts: [action.toast, ...state.toasts].slice(0, 5) };
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
};

let dispatch: React.Dispatch<ToastAction> | null = null;

export function useToastStore() {
  const [state, d] = React.useReducer(toastReducer, { toasts: [] });
  dispatch = d;
  return { toasts: state.toasts, dispatch: d };
}

let counter = 0;

export function toast({
  title,
  description,
  variant = 'default',
  duration = 4000,
}: Omit<ToastData, 'id'>) {
  const id = String(++counter);
  dispatch?.({ type: 'ADD', toast: { id, title, description, variant, duration } });
  setTimeout(() => {
    dispatch?.({ type: 'REMOVE', id });
  }, duration);
  return id;
}

export function useToast() {
  return { toast };
}
