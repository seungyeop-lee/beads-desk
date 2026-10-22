import type { ReactNode } from "react";

type Range = { from: string | null; to: string | null };
type Props = {
  label: string;
  fromLabel: string;
  toLabel: string;
  clearLabel: string;
  range: Range;
  onChange: (range: Range) => void;
  children?: ReactNode;
};

export function DateRangeFields({
  label,
  fromLabel,
  toLabel,
  clearLabel,
  range,
  onChange,
  children,
}: Props) {
  return (
    <fieldset aria-label={label} className="flex min-w-0 flex-wrap items-center gap-1.5">
      {children}
      <input
        type="date"
        className="input input-sm w-36 rounded-full"
        aria-label={fromLabel}
        value={range.from ?? ""}
        onChange={(event) => onChange({ ...range, from: event.target.value || null })}
      />
      <span className="text-emphasis-40">~</span>
      <input
        type="date"
        className="input input-sm w-36 rounded-full"
        aria-label={toLabel}
        value={range.to ?? ""}
        onChange={(event) => onChange({ ...range, to: event.target.value || null })}
      />
      {(range.from || range.to) && (
        <button
          type="button"
          className="btn btn-ghost btn-xs rounded-full"
          onClick={() => onChange({ from: null, to: null })}
        >
          {clearLabel}
        </button>
      )}
    </fieldset>
  );
}
