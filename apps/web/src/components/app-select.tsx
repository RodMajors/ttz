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
type SelectContentProps = BaseSelectContentProps & { isNonModal?: boolean };
const NonModalSelectContent = BaseSelectContent as React.ComponentType<SelectContentProps>;

/**
 * Keep an opened react-aria popover inside the active Radix Dialog. A portal
 * under document.body falls outside Dialog's focus and pointer interaction
 * boundary, which makes the menu appear but prevents selecting an item.
 */
function SelectContent({ UNSTABLE_portalContainer, isNonModal = true, ...props }: SelectContentProps) {
  const dialogPortalContainer = useContext(SelectPortalContext);

  return (
    <NonModalSelectContent
      {...props}
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
