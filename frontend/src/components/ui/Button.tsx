import clsx from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "neutral" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  // Save, Join. Disabled it turns gray, like Zoom's empty Join button.
  primary: "bg-zoom-blue text-white disabled:bg-btn-disabled disabled:text-text-secondary/60",
  // Copy Invitation, Cancel.
  neutral: "bg-pill-neutral text-zoom-blue",
  danger: "bg-zoom-red text-white",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        // brightness changes color only, so hovering never shifts the layout.
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap",
        "enabled:hover:brightness-95 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
