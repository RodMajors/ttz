"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectPortalContext } from "./select-portal-context";

type BaseSelectProps<T extends object> = React.ComponentProps<typeof BaseSelect<T>>;
type BaseSelectContentProps = React.ComponentProps<typeof BaseSelectContent>;
type SelectContentProps = BaseSelectContentProps & { isNonModal?: boolean };
const NonModalSelectContent = BaseSelectContent as React.ComponentType<
  SelectContentProps & { ref?: React.Ref<HTMLElement> }
>;

type SelectOverlayContextValue = {
  rootRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  setOpen: (open: boolean) => void;
};
const SelectOverlayContext = createContext<SelectOverlayContextValue | null>(null);

const labelsByName: Record<string, string> = {
  audience: "接收范围",
  characterId: "报名角色",
  durationMinutes: "活动时长",
  preferredSpecId: "出战专精",
  sourceType: "技能来源",
  status: "状态",
  type: "活动类型",
};
const labelsById: Record<string, string> = {
  "filter-status": "活动状态筛选",
  "filter-status-select": "活动状态筛选",
  durationMinutes: "活动时长",
  "edit-durationMinutes": "活动时长",
  characterId: "报名角色",
  preferredSpecId: "出战专精",
};
const labelsByValuePlaceholder: Record<string, string> = {
  Preset: "主题配色",
  "Select font": "字体",
};

function Select<T extends object>({
  className,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  required,
  isOpen: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  name,
  children,
  ...props
}: Omit<BaseSelectProps<T>, "children" | "selectedKey" | "defaultSelectedKey" | "onSelectionChange"> & {
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (open: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(open);
      onOpenChange?.(open);
    },
    [controlledOpen, onOpenChange],
  );

  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) || contentRef.current?.contains(event.target)) return;
      // Non-modal popovers let this same pointer event reach the control underneath.
      setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [isOpen, setOpen]);

  const triggerElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement<{ id?: string; "aria-label"?: string; children?: React.ReactNode }> =>
      React.isValidElement(child) && child.type === SelectTrigger,
  );
  const triggerLabel = triggerElement?.props["aria-label"];
  const triggerId = triggerElement?.props.id;
  const valueElement = React.Children.toArray(triggerElement?.props.children).find(
    (child): child is React.ReactElement<{ placeholder?: string }> =>
      React.isValidElement(child) && child.type === SelectValue,
  );
  const valuePlaceholder = valueElement?.props.placeholder;
  const inferredTriggerIdLabel =
    labelsById[triggerId ?? ""] ??
    (triggerId?.startsWith("privilege-") ? "成员身份组" : undefined) ??
    (triggerId?.startsWith("audience-") ? "活动接收范围" : undefined) ??
    (triggerId?.startsWith("status-") ? "状态" : undefined);
  const inferredLabel =
    props["aria-label"] ??
    triggerLabel ??
    (props["aria-labelledby"]
      ? undefined
      : (labelsByName[name ?? ""] ??
        inferredTriggerIdLabel ??
        labelsByValuePlaceholder[valuePlaceholder ?? ""] ??
        valuePlaceholder ??
        placeholder ??
        "选择选项"));

  return (
    <SelectOverlayContext.Provider value={{ rootRef, contentRef, setOpen }}>
      <div ref={rootRef} className="contents" data-slot="app-select">
        <BaseSelect<T>
          {...props}
          aria-label={inferredLabel}
          className={className}
          name={name}
          isOpen={isOpen}
          onOpenChange={setOpen}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          onValueChange={onValueChange}
        >
          {children}
        </BaseSelect>
      </div>
    </SelectOverlayContext.Provider>
  );
}

function SelectContent({ UNSTABLE_portalContainer, isNonModal = true, ...props }: SelectContentProps) {
  const dialogPortalContainer = useContext(SelectPortalContext);
  const overlay = useContext(SelectOverlayContext);
  const setContentRef = useCallback(
    (element: HTMLElement | null) => {
      if (overlay) overlay.contentRef.current = element;
    },
    [overlay],
  );

  return (
    <NonModalSelectContent
      {...props}
      ref={setContentRef}
      isNonModal={isNonModal}
      UNSTABLE_portalContainer={UNSTABLE_portalContainer ?? dialogPortalContainer ?? undefined}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
