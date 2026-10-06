import clsx from "clsx";

type AvatarProps = {
  name: string;
  color: string; // the user's avatar_color, a hex value
  className?: string; // size, corner radius and text size
};

/** Zoom's initials avatar: the first letter of the name on a colored square. */
export function Avatar({ name, color, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={clsx("flex shrink-0 items-center justify-center text-white select-none", className)}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}
