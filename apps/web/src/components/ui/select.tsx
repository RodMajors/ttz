"use client";

import * as React from "react";
import {
  Button as AriaButton,
  composeRenderProps,
  Header as AriaHeader,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxSection as AriaListBoxSection,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Separator as AriaSeparator,
  type ListBoxProps,
  type SelectProps,
  type SelectValueProps,
} from "react-aria-components";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "cn";

function Select<T extends object>({
  className,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  required,
  ...props
}: Omit<SelectProps<T>, "children" | "selectedKey" | "defaultSelectedKey" | "onSelectionChange"> & {
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <AriaSelect
      data-slot="select"
      className={cn("w-full", className)}
      selectedKey={value}
      defaultSelectedKey={defaultValue}
      placeholder={placeholder}
      isRequired={required}
      onSelectionChange={(key) => {
        if (key != null) onValueChange?.(String(key));
      }}
      {...props}
    />
  );
}

function SelectGroup<T extends object>({ className, ...props }: React.ComponentProps<typeof AriaListBoxSection<T>>) {
  return <AriaListBoxSection data-slot="select-group" className={cn("p-1", className)} {...props} />;
}

function SelectValue<T extends object>({ className, children, placeholder, ...props }: SelectValueProps<T> & { placeholder?: string }) {
  return (
    <AriaSelectValue
      data-slot="select-value"
      className={cn("min-w-0 flex-1 truncate text-left", className)}
      {...props}
    >
      {typeof children === "function"
        ? children
        : ({ defaultChildren, isPlaceholder }) => (isPlaceholder ? placeholder : defaultChildren)}
    </AriaSelectValue>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof AriaButton> & { size?: "sm" | "default" }) {
  return (
    <AriaButton
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-sm font-normal text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (renderedChildren) => (
        <>
          {renderedChildren}
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
        </>
      ))}
    </AriaButton>
  );
}

function SelectContent({
  className,
  children,
  placement = "bottom",
  offset = 4,
  ...props
}: Omit<React.ComponentProps<typeof AriaPopover>, "className" | "children"> & {
  className?: string;
  children?: React.ReactNode;
  placement?: React.ComponentProps<typeof AriaPopover>["placement"];
}) {
  return (
    <AriaPopover
      data-slot="select-content"
      placement={placement}
      offset={offset}
      className={cn(
        "z-50 w-(--trigger-width) overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md outline-none ring-1 ring-foreground/10 entering:animate-in entering:fade-in-0 entering:zoom-in-95 exiting:animate-out exiting:fade-out-0 exiting:zoom-out-95",
        className,
      )}
      {...props}
    >
      <AriaListBox
        data-slot="select-list"
        className="max-h-[min(var(--visual-viewport-height),20rem)] overflow-y-auto p-1 outline-none"
      >
        {children}
      </AriaListBox>
    </AriaPopover>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof AriaListBoxItem> & { value?: string }) {
  return (
    <AriaListBoxItem
      data-slot="select-item"
      id={value ?? props.id}
      textValue={typeof children === "string" ? children : undefined}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-selected:bg-accent data-selected:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (renderedChildren, { isSelected }) => (
        <>
          <span className="min-w-0 flex-1 truncate">{renderedChildren}</span>
          <span className="absolute right-2 flex size-4 items-center justify-center">
            {isSelected ? <Check aria-hidden="true" /> : null}
          </span>
        </>
      ))}
    </AriaListBoxItem>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof AriaHeader>) {
  return <AriaHeader data-slot="select-label" className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof AriaSeparator>) {
  return <AriaSeparator data-slot="select-separator" className={cn("my-1 h-px bg-border", className)} {...props} />;
}

function SelectList<T extends object>(props: ListBoxProps<T>) {
  return <AriaListBox {...props} />;
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectList, SelectSeparator, SelectTrigger, SelectValue };
