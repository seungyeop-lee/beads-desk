"use client";

import { useEffect, useId, useState } from "react";
import { HelpIcon } from "./icons";
import { TooltipBubble } from "./TooltipBubble";

type HelpTooltipProps = {
  help: string;
  placement?: "below" | "header-end";
};

export function HelpTooltip({ help, placement = "below" }: HelpTooltipProps) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor]);
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
        aria-describedby={anchor ? id : undefined}
        onMouseEnter={(event) => setAnchor(event.currentTarget)}
        onMouseLeave={() => setAnchor(null)}
        onFocus={(event) => setAnchor(event.currentTarget)}
        onBlur={() => setAnchor(null)}
        onClick={() => setAnchor(null)}
      >
        <HelpIcon width={16} height={16} />
      </button>
      <TooltipBubble anchor={anchor} id={id} align={headerEnd ? "end" : "start"}>
        {help}
      </TooltipBubble>
    </span>
  );
}
