import clsx from "clsx";
import type { ComponentProps } from "react";

// Shared by text inputs, textareas and selects, so every field looks the same.
export const FIELD_CLASSES = clsx(
  "w-full rounded-lg border border-text-secondary/40 bg-white px-3 text-[15px] text-text-primary",
  "placeholder:text-text-secondary/70",
  "focus:border-zoom-blue focus:ring-3 focus:ring-zoom-blue/20 focus:outline-none",
  "aria-invalid:border-zoom-red",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(FIELD_CLASSES, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(FIELD_CLASSES, "min-h-24 py-2", className)} {...props} />;
}
