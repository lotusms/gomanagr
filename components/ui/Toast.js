'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { HiX, HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle } from 'react-icons/hi';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

let toastIdCounter = 0;

const typeConfig = {
  success: {
    icon: HiCheckCircle,
    className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    iconClassName: 'text-green-500',
  },
  error: {
    icon: HiXCircle,
    className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    iconClassName: 'text-red-500',
  },
  warning: {
    icon: HiExclamationCircle,
    className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    iconClassName: 'text-yellow-500',
  },
  info: {
    icon: HiInformationCircle,
    className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    iconClassName: 'text-blue-500',
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++toastIdCounter;
    const safeDuration = typeof duration === 'number' && duration > 0 ? duration : 5000;
    setToasts((prev) => [...prev, { id, message, type, duration: safeDuration }]);
    return id;
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
      <ToastPrimitive.Provider duration={5000} label="Notification">
        {children}
        {toasts.map((toast) => (
          <RadixToast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        <ToastPrimitive.Viewport
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full outline-none list-none p-0 m-0"
          label="Notifications (F8)"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

function RadixToast({ id, message, type, duration, onClose }) {
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;
  const dismissMs = typeof duration === 'number' && duration > 0 ? duration : 5000;

  // Guarantee auto-dismiss so toasts always go away even if Radix timer misbehaves
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, dismissMs);
    return () => clearTimeout(timer);
  }, [dismissMs, onClose]);

  return (
    <ToastPrimitive.Root
      open
      duration={dismissMs}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={`
        pointer-events-auto
        group
        rounded-lg shadow-lg border p-4
        flex items-start gap-3
        ${config.className}
        border-gray-200 dark:border-gray-700
      `}
      data-type={type}
    >
      <div className={`flex-shrink-0 ${config.iconClassName}`}>
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      <ToastPrimitive.Description asChild>
        <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100">
          {message}
        </p>
      </ToastPrimitive.Description>
      <ToastPrimitive.Close
        className="flex-shrink-0 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
        aria-label="Dismiss"
      >
        <HiX className="w-5 h-5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
