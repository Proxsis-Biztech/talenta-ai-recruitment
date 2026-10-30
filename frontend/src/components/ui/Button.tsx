import React from 'react';
import { cn } from './utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accentSubtle' | 'default' | 'destructive' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'default';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base tactile anti-slop button styling
    const baseClasses =
      'inline-flex items-center justify-center font-medium font-sans transition-all duration-150 ease-out select-none cursor-pointer ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy focus-visible:ring-offset-1 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    // Talenta+ shadcn color variant styling
    const variantClasses: Record<string, string> = {
      default:
        'bg-primary-navy hover:bg-navy-dark text-white border border-primary-navy hover:border-navy-dark shadow-xs active:bg-ink',
      primary:
        'bg-primary-navy hover:bg-navy-dark text-white border border-primary-navy hover:border-navy-dark shadow-xs active:bg-ink',
      secondary:
        'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-xs active:bg-slate-100',
      outline:
        'bg-transparent hover:bg-slate-100/80 text-slate-700 border border-slate-300 hover:border-slate-400 active:bg-slate-200/60',
      ghost:
        'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-transparent active:bg-slate-200/50',
      danger:
        'bg-error-red hover:bg-[#B91C1C] text-white border border-error-red shadow-xs active:bg-[#991B1B]',
      destructive:
        'bg-error-red hover:bg-[#B91C1C] text-white border border-error-red shadow-xs active:bg-[#991B1B]',
      accentSubtle:
        'bg-soft-blue hover:bg-[#E0E7FF] text-primary-navy border border-accent-border hover:border-[#A5B4FC] active:bg-accent-border',
      link:
        'text-primary-navy underline-offset-4 hover:underline p-0 h-auto border-0 bg-transparent shadow-none',
    };

    // Relaxed tactile radius scales & generous breathing room
    const sizeClasses: Record<string, string> = {
      xs: 'text-xs h-8 px-3 gap-1.5 rounded-md font-medium',
      sm: 'text-xs sm:text-sm h-9 px-3.5 gap-2 rounded-lg font-medium',
      md: 'text-sm h-10 px-4.5 gap-2.5 rounded-lg font-medium',
      default: 'text-sm h-10 px-4.5 gap-2.5 rounded-lg font-medium',
      lg: 'text-sm sm:text-base h-11 px-5 gap-3 rounded-lg font-semibold',
      icon: 'h-9 w-9 p-0 rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-current opacity-80" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
