import type { ReactNode } from "react";

/** Styles for the blue text links in the form ("+ Add Description", "Show"). */
export const FORM_LINK_CLASSES = "rounded text-[15px] text-zoom-blue hover:underline";

type FormRowProps = {
  label: ReactNode;
  htmlFor?: string; // the input the label names, when the row has a single input
  children: ReactNode;
};

/**
 * One row of the Schedule form: label on the left, fields on the right, as in
 * Zoom. Below md the label sits above the fields.
 */
export function FormRow({ label, htmlFor, children }: FormRowProps) {
  // leading-9 matches the field height, so the label lines up with the first field.
  const labelClasses = "text-[15px] md:leading-9";

  return (
    <div className="grid gap-x-4 gap-y-2 md:grid-cols-[170px_minmax(0,1fr)]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClasses}>
          {label}
        </label>
      ) : (
        <span className={labelClasses}>{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FieldError({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return <p className="mt-2 text-sm text-zoom-red">{message}</p>;
}
