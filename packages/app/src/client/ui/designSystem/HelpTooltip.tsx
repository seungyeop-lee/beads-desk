"use client";

import { HelpIcon } from "./icons";

type HelpTooltipProps = {
  help: string;
  placement?: "below" | "header-end";
};

export function HelpTooltip({ help, placement = "below" }: HelpTooltipProps) {
  const headerEnd = placement === "header-end";
  return (
    <span className={headerEnd ? "shrink-0" : undefined}>
      <button
        type="button"
        className={
          headerEnd
            ? "btn btn-ghost btn-sm btn-square"
            : "btn btn-circle btn-ghost btn-xs text-emphasis-50"
        }
        aria-label={help}
        data-tooltip={help}
        data-tooltip-placement={headerEnd ? "end" : undefined}
      >
        <HelpIcon width={16} height={16} />
      </button>
    </span>
  );
}
