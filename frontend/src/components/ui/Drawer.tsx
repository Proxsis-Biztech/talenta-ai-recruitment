import React, { useEffect } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  docketRef?: string;
  side?: 'right' | 'left';
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  docketRef,
  side = 'right',
  width = 'md',
  children,
  footer,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const sideClasses = {
    right: 'inset-y-0 right-0 border-l border-slate-200/90 animate-in slide-in-from-right duration-200',
    left: 'inset-y-0 left-0 border-r border-slate-200/90 animate-in slide-in-from-left duration-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div
        className={cn(
          'fixed w-full bg-white shadow-2xl flex flex-col z-10',
          sideClasses[side],
          widthClasses[width],
          className
        )}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
          <div>
            {docketRef && (
              <span className="text-[10.5px] font-bold text-[#0E7490] font-mono tracking-wider uppercase block mb-0.5">
                {docketRef}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-heading">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Tutup Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
