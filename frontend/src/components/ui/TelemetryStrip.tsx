import React from 'react';
import { cn } from './utils';

export interface TelemetryItemProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: string;
  trend?: 'neutral' | 'success' | 'warning' | 'teal' | 'navy';
  badge?: React.ReactNode;
  className?: string;
}

export const TelemetryItem: React.FC<TelemetryItemProps> = ({
  label,
  value,
  unit,
  caption,
  trend = 'neutral',
  badge,
  className,
}) => {
  const trendColors = {
    neutral: 'text-slate-900',
    navy: 'text-primary-navy',
    teal: 'text-primary-navy',
    success: 'text-success-green',
    warning: 'text-warning-amber',
  };

  return (
    <div className={cn('flex flex-col justify-between p-4 sm:p-5 transition-colors', className)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 font-sans">
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-2xl sm:text-3xl font-extrabold font-heading tracking-tight', trendColors[trend])}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>
      {caption && <span className="text-xs text-slate-400 mt-1">{caption}</span>}
    </div>
  );
};

export interface TelemetryStripProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  tag?: string;
  headerRight?: React.ReactNode;
}

export const TelemetryStrip = React.forwardRef<HTMLDivElement, TelemetryStripProps>(
  ({ className, title, tag, headerRight, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden',
          className
        )}
        {...props}
      >
        {(title || tag || headerRight) && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {title && (
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-mono">
                  {title}
                </span>
              )}
              {tag && (
                <span className="px-1.5 py-0.5 text-[9.5px] font-semibold font-mono bg-soft-blue text-[#0E7490] border border-accent-border/60 rounded-xs">
                  {tag}
                </span>
              )}
            </div>
            {headerRight}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          {children}
        </div>
      </div>
    );
  }
);

TelemetryStrip.displayName = 'TelemetryStrip';
