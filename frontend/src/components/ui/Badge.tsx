import React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'teal' | 'navy' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'secondary' | 'destructive' | 'outline';
  format?: 'soft' | 'outline' | 'solid';
  isMonospace?: boolean;
  hasDot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'neutral',
      format = 'soft',
      isMonospace = false,
      hasDot = false,
      children,
      ...props
    },
    ref
  ) => {
    // Base badge container with soft, comfortable padding & natural typography
    const baseClasses =
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md select-none border whitespace-nowrap transition-colors font-sans';

    // Map shadcn variant names
    const resolvedVariant = 
      variant === 'default' ? 'navy' :
      variant === 'secondary' ? 'neutral' :
      variant === 'destructive' ? 'danger' :
      variant === 'outline' ? 'neutral' : variant;

    const resolvedFormat = variant === 'outline' ? 'outline' : format;

    // Color definitions per Talenta+ tokens
    const styles: Record<string, Record<string, string>> = {
      soft: {
        teal: 'bg-soft-blue text-primary-navy border-accent-border',
        navy: 'bg-soft-blue text-primary-navy border-accent-border',
        neutral: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-[#DCFCE7] text-success-green border-[#BBF7D0]',
        warning: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
        danger: 'bg-[#FEE2E2] text-error-red border-[#FECACA]',
        info: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
      },
      outline: {
        teal: 'bg-transparent text-primary-navy border-accent-border',
        navy: 'bg-transparent text-primary-navy border-accent-border',
        neutral: 'bg-transparent text-slate-700 border-slate-300',
        success: 'bg-transparent text-success-green border-[#BBF7D0]',
        warning: 'bg-transparent text-[#D97706] border-[#FDE68A]',
        danger: 'bg-transparent text-error-red border-[#FECACA]',
        info: 'bg-transparent text-[#0284C7] border-[#BAE6FD]',
      },
      solid: {
        teal: 'bg-primary-navy text-white border-primary-navy',
        navy: 'bg-primary-navy text-white border-primary-navy',
        neutral: 'bg-slate-800 text-white border-slate-800',
        success: 'bg-success-green text-white border-success-green',
        warning: 'bg-warning-amber text-white border-warning-amber',
        danger: 'bg-error-red text-white border-error-red',
        info: 'bg-info-cyan text-white border-info-cyan',
      },
    };

    const dotColors: Record<string, string> = {
      teal: 'bg-primary-navy',
      navy: 'bg-primary-navy',
      neutral: 'bg-slate-400',
      success: 'bg-success-green',
      warning: 'bg-warning-amber',
      danger: 'bg-error-red',
      info: 'bg-info-cyan',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          styles[resolvedFormat]?.[resolvedVariant] || styles.soft.neutral,
          isMonospace ? 'font-mono text-[10.5px]' : 'font-sans',
          className
        )}
        {...props}
      >
        {hasDot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              resolvedFormat === 'solid' ? 'bg-white' : dotColors[resolvedVariant] || 'bg-slate-400'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
