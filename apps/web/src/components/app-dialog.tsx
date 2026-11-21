"use client";

import { type ComponentProps, useCallback, useState } from "react";
import { AlertDialogContent as BaseAlertDialogContent } from "@/components/ui/alert-dialog";
import { DialogContent as BaseDialogContent } from "@/components/ui/dialog";
import { SelectPortalContext } from "./select-portal-context";

function DialogContent({ children, ...props }: ComponentProps<typeof BaseDialogContent>) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setPortalContainerRef = useCallback((element: HTMLDivElement | null) => setPortalContainer(element), []);
  return (
    <SelectPortalContext.Provider value={portalContainer}>
      <BaseDialogContent {...props} ref={setPortalContainerRef}>
        {children}
      </BaseDialogContent>
    </SelectPortalContext.Provider>
  );
}

function AlertDialogContent({ children, ...props }: ComponentProps<typeof BaseAlertDialogContent>) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setPortalContainerRef = useCallback((element: HTMLDivElement | null) => setPortalContainer(element), []);
  return (
    <SelectPortalContext.Provider value={portalContainer}>
      <BaseAlertDialogContent {...props} ref={setPortalContainerRef}>
        {children}
      </BaseAlertDialogContent>
    </SelectPortalContext.Provider>
  );
}

export * from "@/components/ui/alert-dialog";
export * from "@/components/ui/dialog";
export { AlertDialogContent, DialogContent };
