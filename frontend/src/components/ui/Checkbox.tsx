import type { ComponentProps } from "react";

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  label: string;
};

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" className="size-4 cursor-pointer accent-zoom-blue" {...props} />
      {label}
    </label>
  );
}
