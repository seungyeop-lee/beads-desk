"use client";

import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TooltipBubble } from "./TooltipBubble";

export function TooltipLayer() {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let focusFrame = 0;
    const close = () => {
      cancelAnimationFrame(focusFrame);
      setAnchor(null);
    };
    const scroll = () => setAnchor(null);
    const findTarget = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
    const enter = (event: MouseEvent | FocusEvent) => {
      const target = findTarget(event.target);
      if (event.type === "mouseover" && target && target === findTarget(event.relatedTarget))
        return;
      cancelAnimationFrame(focusFrame);
      if (event.type === "focusin") {
        // focus가 대상을 화면 안으로 스크롤한 뒤에 안내를 엽니다.
        focusFrame = requestAnimationFrame(() =>
          setAnchor(target?.dataset.tooltip ? target : null),
        );
      } else setAnchor(target?.dataset.tooltip ? target : null);
    };
    const leave = (event: MouseEvent | FocusEvent) => {
      if (findTarget(event.target) !== findTarget(event.relatedTarget)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mouseover", enter);
    document.addEventListener("mouseout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    document.addEventListener("click", close, true);
    document.addEventListener("dragstart", close, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("mouseover", enter);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
      document.removeEventListener("click", close, true);
      document.removeEventListener("dragstart", close, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
    };
  }, []);
  useLayoutEffect(() => {
    if (!anchor) return;
    const original = anchor.getAttribute("aria-describedby");
    const description = original
      ?.split(/\s+/)
      .map((reference) => document.getElementById(reference)?.textContent)
      .join(" ");
    if (description?.trim() === anchor.dataset.tooltip?.trim()) return;
    anchor.setAttribute("aria-describedby", [original, id].filter(Boolean).join(" "));
    return () => {
      if (original === null) anchor.removeAttribute("aria-describedby");
      else anchor.setAttribute("aria-describedby", original);
    };
  }, [anchor, id]);
  return anchor
    ? createPortal(
        <TooltipBubble
          anchor={anchor}
          id={id}
          align={anchor.dataset.tooltipPlacement === "end" ? "end" : "start"}
        >
          {anchor.dataset.tooltip}
        </TooltipBubble>,
        document.body,
      )
    : null;
}
