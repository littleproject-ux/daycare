'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toastIcons,
} from './toast';
import { useToastStore } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToastStore();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant = 'default', ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start gap-3">
            {toastIcons[variant]}
            <div className="flex flex-col gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
