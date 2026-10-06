import clsx from "clsx";
import type { ComponentProps } from "react";

type IconButtonProps = ComponentProps<"button"> & {
  label: string; // required: an icon alone tells a screen reader nothing
};

export function IconButton({ label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={clsx(
        "inline-flex size-8 items-center justify-center rounded-lg text-text-primary hover:bg-black/5",
        className,
      )}
      {...props}
    />
  );
}
