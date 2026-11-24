import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from './utils';

const EMPTY_SENTINEL = '__SHADCN_EMPTY_VALUE__';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

const SelectRoot = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-slot="select-trigger"
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-sans text-slate-800 shadow-2xs transition-colors cursor-pointer',
      'placeholder:text-slate-400 hover:border-slate-300',
      'focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/15',
      'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
      '[&>span]:truncate [&>span]:text-left',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      data-slot="select-content"
      className={cn(
        'pointer-events-auto relative z-[300] max-h-72 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg font-sans',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-slate-500">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={cn(
          'p-1.5',
          position === 'popper' &&
            'w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-slate-500">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    data-slot="select-item"
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-xs sm:text-sm font-medium text-slate-700 outline-none font-sans transition-colors',
      'focus:bg-soft-blue focus:text-primary-navy data-[highlighted]:bg-soft-blue data-[highlighted]:text-primary-navy',
      'data-[state=checked]:font-semibold data-[state=checked]:text-primary-navy',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-primary-navy" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-slate-100', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

type ParsedEntry =
  | { kind: 'item'; value: string; label: React.ReactNode; disabled?: boolean }
  | { kind: 'group'; label: string; items: Array<{ value: string; label: React.ReactNode; disabled?: boolean }> };

function extractOptionsFromChildren(children: React.ReactNode): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === 'option') {
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      const rawVal = props.value !== undefined ? String(props.value) : String(props.children ?? '');
      entries.push({
        kind: 'item',
        value: rawVal === '' ? EMPTY_SENTINEL : rawVal,
        label: props.children ?? rawVal,
        disabled: Boolean(props.disabled)
      });
    } else if (child.type === 'optgroup') {
      const props = child.props as { label?: string; children?: React.ReactNode };
      const groupItems: Array<{ value: string; label: React.ReactNode; disabled?: boolean }> = [];
      React.Children.forEach(props.children, (sub) => {
        if (!React.isValidElement(sub) || sub.type !== 'option') return;
        const subProps = sub.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
        const rawVal = subProps.value !== undefined ? String(subProps.value) : String(subProps.children ?? '');
        groupItems.push({
          value: rawVal === '' ? EMPTY_SENTINEL : rawVal,
          label: subProps.children ?? rawVal,
          disabled: Boolean(subProps.disabled)
        });
      });
      entries.push({ kind: 'group', label: props.label || '', items: groupItems });
    } else if ((child.props as { children?: React.ReactNode })?.children) {
      entries.push(...extractOptionsFromChildren((child.props as { children?: React.ReactNode }).children));
    }
  });
  return entries;
}

export interface SelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({
  className,
  label,
  error,
  hint,
  leftIcon,
  options,
  children,
  placeholder = 'Pilih opsi...',
  id,
  name,
  disabled,
  value,
  defaultValue,
  onChange,
  onValueChange,
  'aria-label': ariaLabel
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const entries: ParsedEntry[] = options
    ? options.map((opt) => ({
        kind: 'item',
        value: opt.value === '' ? EMPTY_SENTINEL : String(opt.value),
        label: opt.label,
        disabled: opt.disabled
      }))
    : extractOptionsFromChildren(children);

  const encodeValue = (v: string | number | undefined) => {
    if (v === undefined) return undefined;
    const str = String(v);
    return str === '' ? EMPTY_SENTINEL : str;
  };

  const handleChange = (nextVal: string) => {
    const decoded = nextVal === EMPTY_SENTINEL ? '' : nextVal;
    onValueChange?.(decoded);
    if (onChange) {
      const syntheticEvent = {
        target: { value: decoded, name: name || '' },
        currentTarget: { value: decoded, name: name || '' }
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  const triggerNode = (
    <SelectRoot
      value={encodeValue(value)}
      defaultValue={encodeValue(defaultValue)}
      onValueChange={handleChange}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger
        id={selectId}
        aria-label={ariaLabel || label}
        className={cn(
          leftIcon ? 'pl-10 relative' : '',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15',
          className
        )}
      >
        {leftIcon && (
          <span className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center shrink-0">
            {leftIcon}
          </span>
        )}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {entries.map((entry, idx) =>
          entry.kind === 'group' ? (
            <SelectGroup key={`g-${idx}`}>
              {entry.label && <SelectLabel>{entry.label}</SelectLabel>}
              {entry.items.map((item) => (
                <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <SelectItem key={`${entry.value}-${idx}`} value={entry.value} disabled={entry.disabled}>
              {entry.label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </SelectRoot>
  );

  if (!label && !error && !hint) {
    return triggerNode;
  }

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs sm:text-sm font-semibold text-slate-700 tracking-normal select-none"
        >
          {label}
        </label>
      )}
      {triggerNode}
      {error ? (
        <p className="text-[11px] font-medium text-rose-600 tracking-tight">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
};

export {
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
