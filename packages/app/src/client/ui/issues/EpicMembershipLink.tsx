import Link from "next/link";
import { useId, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

export function EpicMembershipLink({ href, title }: { href: string; title: string }) {
  const messages = useMessages();
  const tooltipId = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const text = messages.issueTable.epicMembership(title || messages.common.untitled);
  function show(event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: Math.max(
        16,
        Math.min(box.left, window.innerWidth - Math.min(512, window.innerWidth - 32) - 16),
      ),
      top: box.bottom + 8,
    });
  }

  return (
    <span className="mt-1 block min-w-0">
      <Link
        href={href}
        scroll={false}
        aria-label={messages.issueTable.openEpic(title)}
        aria-describedby={position ? tooltipId : undefined}
        className="inline-flex h-5 max-w-full items-center rounded-full border border-base-content/20 px-2 text-[11px] text-emphasis-60 underline-offset-2 hover:border-base-content/40 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        onMouseEnter={show}
        onMouseLeave={(event) => {
          if (document.activeElement !== event.currentTarget) setPosition(null);
        }}
        onFocus={show}
        onBlur={() => setPosition(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setPosition(null);
        }}
      >
        <span className="truncate">{text}</span>
      </Link>
      {position &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-50 w-max max-w-[min(32rem,calc(100vw-2rem))] rounded-field bg-neutral px-3 py-2 text-sm leading-snug wrap-anywhere text-neutral-content shadow-lg"
            style={position}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
