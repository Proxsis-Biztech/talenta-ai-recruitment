import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

const TabsRoot = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center rounded-xl bg-slate-100 p-1 text-slate-600 border border-slate-200/80',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold font-sans transition-all cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30',
      'disabled:pointer-events-none disabled:opacity-40',
      'data-[state=active]:bg-primary-navy data-[state=active]:text-white data-[state=active]:shadow-xs',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-3 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  return (
    <TabsRoot value={activeTab} onValueChange={onChange}>
      <TabsPrimitive.List
        className={cn(
          variant === 'underline'
            ? 'flex items-center space-x-1 border-b border-slate-200/90 overflow-x-auto scrollbar-none bg-transparent p-0 rounded-none border-x-0 border-t-0'
            : 'inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1 flex-wrap',
          className
        )}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              variant === 'underline'
                ? 'relative flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer text-slate-500 hover:text-slate-800 border-b-2 border-b-transparent -mb-[1px] data-[state=active]:text-primary-navy data-[state=active]:border-b-primary-navy'
                : 'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:text-primary-navy data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/70',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="w-4 h-4 inline-flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsRoot>
  );
};

export { TabsRoot, TabsList, TabsTrigger, TabsContent };
