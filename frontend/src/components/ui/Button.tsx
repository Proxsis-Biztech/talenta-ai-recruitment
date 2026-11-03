import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium font-sans select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary-navy text-white border border-primary-navy hover:bg-navy-dark hover:border-navy-dark shadow-xs',
        primary: 'bg-primary-navy text-white border border-primary-navy hover:bg-navy-dark hover:border-navy-dark shadow-xs',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
        outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100 hover:border-slate-400',
        ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900',
        danger: 'bg-error-red text-white border border-error-red hover:bg-[#B91C1C] shadow-xs',
        destructive: 'bg-error-red text-white border border-error-red hover:bg-[#B91C1C] shadow-xs',
        accentSubtle: 'bg-soft-blue text-primary-navy border border-accent-border hover:bg-[#E0E7FF] hover:border-[#A5B4FC]',
        link: 'text-primary-navy underline-offset-4 hover:underline p-0 h-auto border-0 bg-transparent shadow-none',
      },
      size: {
        xs: 'h-8 px-3 text-xs rounded-md',
        sm: 'h-9 px-3.5 text-xs sm:text-sm rounded-lg',
        md: 'h-10 px-4.5 text-sm rounded-lg',
        default: 'h-10 px-4.5 text-sm rounded-lg',
        lg: 'h-11 px-5 text-sm sm:text-base rounded-lg',
        icon: 'h-9 w-9 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin opacity-80" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
export { buttonVariants };