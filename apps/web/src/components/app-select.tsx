"use client";

import type * as React from "react";
import { useContext } from "react";
import {
  SelectContent as BaseSelectContent,
  Select,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectPortalContext } from "./select-portal-context";

type BaseSelectContentProps = React.ComponentProps<typeof BaseSelectContent>;

/**
 * Keep an opened react-aria popover inside the active Radix Dialog. A portal
 * under document.body falls outside Dialog's focus and pointer interaction
 * boundary, which makes the menu appear but prevents selecting an item.
 */
function SelectContent({ UNSTABLE_portalContainer, ...props }: BaseSelectContentProps) {
  const dialogPortalContainer = useContext(SelectPortalContext);

  return (
    <BaseSelectContent
      {...props}
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
