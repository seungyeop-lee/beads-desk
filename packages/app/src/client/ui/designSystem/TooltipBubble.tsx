"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  anchor: HTMLElement | null;
  id: string;
  align?: "start" | "end";
  children: ReactNode;
};

export function TooltipBubble({ anchor, id, align = "start", children }: Props) {
  const bubble = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = bubble.current!;
    if (!anchor) {
      if (element.matches(":popover-open")) element.hidePopover();
      return;
    }
    // top layer로 띄워 dialog와 scroll 영역의 경계에도 설명이 잘리지 않게 합니다.
    element.style.left = "8px";
    element.style.top = "8px";
    element.showPopover();
    const target = anchor.getBoundingClientRect();
    const viewport = document.documentElement;
    element.style.maxWidth = `min(32rem, ${viewport.clientWidth - 16}px)`;
    const box = element.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(
        align === "end" ? target.right - box.width : target.left,
        viewport.clientWidth - box.width - 8,
      ),
    );
    const above = target.bottom + 8 + box.height > viewport.clientHeight - 8;
    element.style.left = `${left}px`;
    element.style.top = `${above ? Math.max(8, target.top - box.height - 8) : target.bottom + 8}px`;
    element.style.setProperty(
      "--tooltip-arrow-x",
      `${Math.max(10, Math.min(target.left + target.width / 2 - left, box.width - 10))}px`,
    );
    element.dataset.side = above ? "above" : "below";
    return () => {
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [anchor, align, children]);

  return (
    <span
      ref={bubble}
      id={id}
      role="tooltip"
      popover="manual"
      className="tooltip-surface tooltip-bubble"
    >
      {children}
    </span>
  );
}
