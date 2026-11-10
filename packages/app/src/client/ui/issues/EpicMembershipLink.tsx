import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { TooltipBubble } from "@/client/ui/designSystem/TooltipBubble";

export function EpicMembershipLink({ href, title }: { href: string; title: string }) {
  const messages = useMessages();
  const tooltipId = useId();
  const textRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null);
  const text = messages.issueTable.epicMembership(title || messages.common.untitled);
  const visible = anchor !== null;

  useEffect(() => {
    if (!visible) return;
    const close = () => setAnchor(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const text = textRef.current!;
    const width = text.clientWidth;
    const observer = new ResizeObserver(() => {
      if (text.clientWidth !== width) close();
    });
    observer.observe(text);
    // body portal은 목록의 DOM 자식이 아니며, 중첩 영역의 scroll은 bubble하지 않습니다.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visible]);

  function show(event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) {
    // dialog 종료가 돌려준 focus와 그 직후의 mouseenter는 새 탐색이 아닙니다.
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest("dialog")) return;
    const label = textRef.current;
    if (!label || label.scrollWidth <= label.clientWidth) {
      setAnchor(null);
      return;
    }
    setAnchor(event.currentTarget);
  }

  return (
    <span className="flex min-w-0">
      <Link
        href={href}
        scroll={false}
        aria-label={messages.issueTable.openEpic(title)}
        aria-describedby={anchor ? tooltipId : undefined}
        className="inline-flex h-5 max-w-full items-center rounded-full border border-base-content/20 px-2 text-[11px] text-emphasis-60 underline-offset-2 hover:border-base-content/40 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        onMouseEnter={show}
        onMouseLeave={() => setAnchor(null)}
        onFocus={show}
        onBlur={() => setAnchor(null)}
        onClick={() => setAnchor(null)}
      >
        <span ref={textRef} className="truncate">
          {text}
        </span>
      </Link>
      {anchor &&
        createPortal(
          <TooltipBubble anchor={anchor} id={tooltipId}>
            {text}
          </TooltipBubble>,
          document.body,
        )}
    </span>
  );
}
