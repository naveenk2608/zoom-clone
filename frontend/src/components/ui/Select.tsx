import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { FIELD_CLASSES } from "@/components/ui/Input";

type SelectProps = ComponentProps<"select"> & {
  wrapperClassName?: string; // sets the width
};

/** A native <select> (keyboard and screen-reader support for free) with Zoom's chevron. */
export function Select({ wrapperClassName, className, children, ...props }: SelectProps) {
  return (
    <div className={clsx("relative", wrapperClassName)}>
      <select
        className={clsx(FIELD_CLASSES, "h-9 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-primary"
      />
    </div>
  );
}
