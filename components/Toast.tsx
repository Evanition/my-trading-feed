import React, { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string | null;
  type: ToastType;
  onClose: () => void;
  duration?: number; // milliseconds
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        const closeTimer = setTimeout(() => onClose(), 350);
        return () => clearTimeout(closeTimer);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeClasses = {
    success: 'bg-emerald-600 border-emerald-400', // Brighter emerald
    error: 'bg-rose-600 border-rose-400',     // Brighter rose
    info: 'bg-sky-600 border-sky-400',      // Brighter sky blue
  };

  const animationClass = isVisible ? 'animate-fade-in-up' : 'animate-fade-out-down';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 p-3.5 rounded-lg shadow-xl text-white text-sm font-semibold z-50 transition-all duration-300 border ${typeClasses[type]} ${animationClass}`}
      role="alert"
    >
      {message}
    </div>
  );
};

export default Toast;