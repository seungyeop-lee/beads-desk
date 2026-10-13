"use client";

import { useEffect } from "react";

/**
 * 브라우저는 클릭한 뒤 Escape 같은 키만 눌러도 클릭한 단추와 링크에 :focus-visible 외곽선을 그립니다.
 * Tab으로 포커스를 옮길 때만 외곽선이 보이도록, Tab을 누르면 html에 data-keyboard-focus를 켜고 마우스나 터치를 쓰면 끕니다.
 * 외곽선 규칙은 styles/base.css에 있습니다.
 */
export function KeyboardFocusMode() {
  useEffect(() => {
    const root = document.documentElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") root.dataset.keyboardFocus = "";
    };
    const onPointerDown = () => {
      delete root.dataset.keyboardFocus;
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);
  return null;
}
