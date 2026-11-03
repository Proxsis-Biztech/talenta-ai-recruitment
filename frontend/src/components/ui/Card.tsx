import React from 'react';
import { cn } from './utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hairlineColor?: 'navy' | 'teal' | 'slate' | 'emerald' | 'amber' | 'rose' | 'none';
  elevation?: 'flat' | 'raised' | 'floating';
}

const elevationClasses = {
  flat: 'border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  raised: 'border border-slate-200 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05),0_2px_4px_-2px_rgba(15,23,42,0.03)]',
  floating: 'border border-slate-200/80 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.08),0_4px_6px_-4px_rgba(15,23,42,0.04)]',
};

const hairlineClasses = {
  none: '',
  navy: 'border-t-2 border-t-primary-navy',
  teal: 'border-t-2 border-t-primary-navy',
  slate: 'border-t-2 border-t-slate-600',
  emerald: 'border-t-2 border-t-success-green',
  amber: 'border-t-2 border-t-warning-amber',
  rose: 'border-t-2 border-t-error-red',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hairlineColor = 'none', elevation = 'flat', ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'bg-white text-slate-900 rounded-xl',
        elevationClasses[elevation],
        hairlineClasses[hairlineColor],
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn('px-6 sm:px-7 py-5 flex flex-col space-y-1.5 border-b border-slate-100/90', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn('text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn('text-xs sm:text-sm text-slate-500 font-normal leading-relaxed', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn('p-6 sm:p-7', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        'px-6 sm:px-7 py-4.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between rounded-b-xl',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';