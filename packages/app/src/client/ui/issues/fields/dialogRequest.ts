"use client";

import { useSyncExternalStore } from "react";

export type DialogRequest<Result> = {
  id: number;
  issueId: string;
  /** 한 번만 효과가 있습니다. 확인하면 입력한 값, 취소하면 null을 넘깁니다. */
  settle: (result: Result | null) => void;
};

/**
 * 표, 상세, 보드, 결정 화면 어디서 불러도 같은 dialog 하나를 띄우도록, layout에 둔 host가 그릴 요청을 보관합니다.
 * 새로 묻으면 아직 답하지 않은 앞 요청은 취소로 끝냅니다.
 */
export function createDialogRequest<Result>() {
  let request: DialogRequest<Result> | null = null;
  let nextId = 0;
  const listeners = new Set<() => void>();

  const setRequest = (next: DialogRequest<Result> | null) => {
    request = next;
    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    ask(issueId: string): Promise<Result | null> {
      request?.settle(null);
      return new Promise((resolve) => {
        const current: DialogRequest<Result> = {
          id: nextId++,
          issueId,
          settle: (result) => {
            if (request !== current) return;
            setRequest(null);
            resolve(result);
          },
        };
        setRequest(current);
      });
    },

    /** host가 그릴 지금 요청입니다. 없으면 null입니다. */
    useCurrent(): DialogRequest<Result> | null {
      return useSyncExternalStore(
        subscribe,
        () => request,
        () => null,
      );
    },
  };
}
