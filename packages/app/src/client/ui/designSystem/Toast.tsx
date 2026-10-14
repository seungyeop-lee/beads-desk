"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

/** Toast 하나가 화면에 머무는 시간입니다. 보드 안내처럼 두 문장짜리 문구도 읽을 수 있어야 합니다. */
const TOAST_DURATION_MS = 5000;

type Toast = {
  id: number;
  message: string;
  /** 안내의 종류를 보여 줄 tone class(`tone-*`)입니다. 없으면 점을 그리지 않습니다. */
  tone?: string;
};

const NO_TOASTS: Toast[] = [];
let toasts = NO_TOASTS;
let nextId = 0;
const listeners = new Set<() => void>();

function setToasts(next: Toast[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 사용자 조작의 결과를 화면 구석에 잠시 알립니다. 오류는 Toast 대신 화면 안의 alert로 보여 줍니다. */
export function showToast(message: string, options: { tone?: string } = {}) {
  const id = nextId++;
  setToasts([...toasts, { id, message, tone: options.tone }]);
  setTimeout(() => setToasts(toasts.filter((toast) => toast.id !== id)), TOAST_DURATION_MS);
}

/** showToast로 띄운 안내를 쌓아 보여 줍니다. layout에서 한 번만 렌더링합니다. */
export function ToastRegion() {
  const shown = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => NO_TOASTS,
  );
  const regionRef = useRef<HTMLOutputElement>(null);

  // modal dialog는 top layer에 그려져 일반 요소를 가립니다.
  // 영역을 popover로 top layer에 올리고, Toast가 바뀔 때마다 다시 열어 그사이 열린 dialog보다 위에 둡니다.
  // 화면 낭독기가 새 안내를 읽도록, 비어 있을 때도 영역은 열어 둡니다.
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    if (region.matches(":popover-open")) region.hidePopover();
    region.showPopover();
  }, [shown]);

  return (
    <output
      ref={regionRef}
      popover="manual"
      className="toast toast-end toast-bottom pointer-events-none m-0 overflow-visible border-0 p-0"
    >
      {shown.map((toast) => (
        <div
          key={toast.id}
          className="flex max-w-md items-baseline gap-2.5 rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content shadow-lg"
        >
          {toast.tone && <span className={`tone-dot ${toast.tone} translate-y-[-1px]`} />}
          <span className="whitespace-pre-wrap">{toast.message}</span>
        </div>
      ))}
    </output>
  );
}
