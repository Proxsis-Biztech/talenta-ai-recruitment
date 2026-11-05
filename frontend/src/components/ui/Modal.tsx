import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './utils';

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

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-lg',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  '3xl': 'max-w-7xl',
  '4xl': 'max-w-[84rem]',
  '5xl': 'max-w-[90rem]',
  full: 'max-w-[calc(100vw-2rem)]',
};

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
  const resolvedSize = size || maxWidth || '2xl';

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] min-w-0 -translate-x-1/2 -translate-y-1/2',
            'bg-white rounded-xl border border-slate-200/90',
            'shadow-[0_10px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.06)]',
            'overflow-hidden flex flex-col max-h-[90vh]',
            maxWidthClasses[resolvedSize] || 'max-w-2xl',
            className
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title || 'Dialog'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {description || 'Dialog content'}
          </DialogPrimitive.Description>

          {(title || docketRef) && (
            <div className="px-6 py-5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0">
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

              <DialogPrimitive.Close asChild>
                <button
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md shrink-0"
                  aria-label="Tutup Dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
          )}

          <div className="p-6 sm:p-8 overflow-y-auto flex-1">{children}</div>

          {footer && (
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};