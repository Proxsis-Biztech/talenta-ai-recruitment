import React from 'react';
import { cn } from '../ui/utils';

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  valueColorClass?: string;
  className?: string;
}

const badgeVariantClasses: Record<NonNullable<AdminStatCardProps['badgeVariant']>, string> = {
  neutral: 'bg-[#F1F5F9] text-[#475569]',
  success: 'bg-[#DCFCE7] text-[#166534]',
  warning: 'bg-[#FEF3C7] text-[#92400E]',
  danger: 'bg-[#FEE2E2] text-[#991B1B]',
  info: 'bg-[#E0F2FE] text-[#075985]',
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subtext,
  badge,
  badgeVariant = 'neutral',
  icon: Icon,
  loading = false,
  valueColorClass,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between gap-3 min-w-0',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] truncate" title={label}>
          {label}
        </p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] text-[#1E3A8A] flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-9 w-24 rounded-md bg-[#E2E8F0] animate-pulse" aria-hidden="true" />
      ) : (
        <p className={cn('text-[30px] leading-tight font-bold text-[#0F172A] tabular-nums font-heading', valueColorClass)}>
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </p>
      )}

      {(subtext || badge) && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          {subtext ? (
            <p className="text-xs text-[#64748B] truncate" title={subtext}>
              {subtext}
            </p>
          ) : (
            <span />
          )}
          {badge && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 whitespace-nowrap',
                badgeVariantClasses[badgeVariant]
              )}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export interface AdminEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={cn('py-12 px-4 text-center space-y-2', className)}>
    <Icon className="w-12 h-12 text-[#CBD5E1] mx-auto" />
    <p className="text-base font-semibold text-[#0F172A]">{title}</p>
    <p className="text-sm text-[#64748B] max-w-md mx-auto">{description}</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);
