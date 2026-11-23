import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from './utils';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const checkbox = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={id}
      data-slot="checkbox"
      className={cn(
        'peer h-4 w-4 shrink-0 rounded border border-slate-300 bg-white shadow-2xs transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary-navy data-[state=checked]:bg-primary-navy data-[state=checked]:text-white',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label) return checkbox;

  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer select-none">
      {checkbox}
      <span>{label}</span>
    </label>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
