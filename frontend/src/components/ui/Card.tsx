import clsx from "clsx";
import type { ComponentProps } from "react";

/** The white, softly shadowed panel that every dashboard section sits on. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={clsx("rounded-xl bg-white shadow-[0_2px_12px_rgba(0,3,31,0.08)]", className)}
      {...props}
    />
  );
}
