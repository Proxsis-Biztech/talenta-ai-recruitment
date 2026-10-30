import React, { useEffect } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  docketRef?: string;
  category?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  docketRef,
  category = 'KIN-DOSSIER',
  icon,
  maxWidth,
  size,
  children,
  footer,
  className,
}) => {
  // Handle ESC key to dismiss
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

  const resolvedSize = (size as any) || maxWidth || '2xl';

  const maxWidthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full m-4',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Tactical Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-lg border border-slate-200/90',
          'shadow-[0_10px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.06)]',
          'overflow-hidden flex flex-col max-h-[90vh] z-10 transition-all duration-150',
          maxWidthClasses[resolvedSize] || 'max-w-2xl',
          className
        )}
      >
        {/* Architectural Modal Header */}
        {(title || docketRef) && (
          <div className="px-5 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-8 h-8 rounded-md bg-soft-blue border border-accent-border/60 text-[#0E7490] flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {(docketRef || category) && (
                  <div className="flex items-center gap-2 mb-0.5">
                    {category && (
                      <span className="text-[10px] font-bold text-[#0E7490] tracking-wider uppercase font-mono">
                        {category}
                      </span>
                    )}
                    {docketRef && (
                      <>
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-[10.5px] font-medium text-slate-500 font-mono">
                          {docketRef}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {title && (
                  <h3 className="text-base font-bold text-slate-900 tracking-tight font-heading truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
              aria-label="Tutup Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Modal Action Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
