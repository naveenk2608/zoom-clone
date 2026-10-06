type RadioOption<T extends string> = {
  value: T;
  label: string;
};

type RadioGroupProps<T extends string> = {
  name: string; // groups the native radios, so arrow keys move between them
  label: string; // read out by screen readers
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
};

/** A row of native radio buttons, like Zoom's "on / off" choices. */
export function RadioGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-10">
      {options.map((option) => (
        <label key={option.value} className="inline-flex cursor-pointer items-center gap-2 text-[15px]">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="size-4 cursor-pointer accent-zoom-blue"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
