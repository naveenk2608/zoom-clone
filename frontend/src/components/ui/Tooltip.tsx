"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

export const NOT_AVAILABLE = "Not available in this demo";

type TooltipProps = {
  content: string;
  children: ReactElement; // the trigger; it must accept a ref (a DOM element does)
};

/** Shows `content` on hover and on keyboard focus. */
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-50 rounded-md bg-zoom-navy px-2.5 py-1.5 text-xs text-white shadow-md"
          >
            {content}
            <RadixTooltip.Arrow className="fill-zoom-navy" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

/** For out-of-scope controls that are only there to look like Zoom. */
export function NotAvailable({ children }: { children: ReactElement }) {
  return <Tooltip content={NOT_AVAILABLE}>{children}</Tooltip>;
}
