import { useRouter } from "next/navigation";

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  optionLabel: (option: T) => string;
  isValue: (value: string) => value is T;
  save: (value: T) => void;
};

export function PreferenceSelect<T extends string>({
  label,
  value,
  options,
  optionLabel,
  isValue,
  save,
}: Props<T>) {
  const router = useRouter();
  return (
    <select
      className="select w-full"
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        if (!isValue(next)) return;
        save(next);
        router.refresh();
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {optionLabel(option)}
        </option>
      ))}
    </select>
  );
}
