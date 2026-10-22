import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";

type Props = {
  title: ReactNode;
  count?: number;
  tone?: string;
  variant?: "section" | "list" | "table" | "board" | "bare";
  children?: ReactNode;
  disclosure?: { expanded: boolean; label: string; onToggle: () => void };
};

const variants = {
  section: "flex items-center gap-2 px-1 text-body font-bold",
  list: "flex items-baseline gap-2 px-1 text-body font-bold",
  table: "flex items-baseline gap-2 text-lg font-bold tracking-tight",
  board: "flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 px-1.5 text-sm font-bold",
  bare: "flex items-baseline gap-2 text-body font-bold",
};

export function GroupHeading({
  title,
  count,
  tone,
  variant = "section",
  children,
  disclosure,
}: Props) {
  const countLabel = count !== undefined && (
    <span className="font-mono text-xs font-normal text-emphasis-50">{count}</span>
  );
  if (disclosure) {
    return (
      <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
        <button
          type="button"
          className="flex items-baseline gap-2 text-body font-bold"
          aria-expanded={disclosure.expanded}
          aria-label={disclosure.label}
          onClick={disclosure.onToggle}
        >
          <ChevronRightIcon
            width={14}
            height={14}
            className={`self-center text-emphasis-50 transition-transform ${disclosure.expanded ? "rotate-90" : ""}`}
          />
          {tone && <span className={`tone-dot ${tone} self-center`} />}
          {title}
          {countLabel}
        </button>
        {children}
      </h2>
    );
  }
  return (
    <h2 className={variants[variant]}>
      {tone && <span className={`tone-dot ${tone}`} />}
      {variant === "board" ? (
        <span className="flex items-baseline gap-2 whitespace-nowrap">
          {title}
          {countLabel}
        </span>
      ) : (
        <>
          {title}
          {countLabel}
        </>
      )}
      {children}
    </h2>
  );
}
