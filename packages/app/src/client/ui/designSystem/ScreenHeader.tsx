import type { ReactNode } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HelpIcon } from "./icons";

type Props = {
  title: ReactNode;
  /** 상단 탭과 같은 화면 색입니다. tone-* class를 넘깁니다. 상단 탭에 없는 화면은 넘기지 않습니다. */
  tone?: string;
  count?: number;
  loading?: boolean;
  /** 제목 옆 ? 아이콘에 올리거나 초점을 두면 보이는 설명입니다. */
  help?: string;
  /** 제목 줄 오른쪽에 두는 조작입니다. */
  children?: ReactNode;
};

/** 화면 맨 위의 제목 줄입니다. */
export function ScreenHeader({ title, tone, count, loading, help, children }: Props) {
  const messages = useMessages();
  return (
    <header className="@container flex flex-wrap items-end gap-x-6 gap-y-3 pt-4 pb-4">
      <div className="relative flex min-w-0 items-center gap-3">
        {tone && <span className={`tone-dot ${tone} size-3`} />}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {help && (
          <span className="group/help">
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-xs text-base-content/45"
              aria-label={help}
            >
              <HelpIcon width={16} height={16} />
            </button>
            {/* 제목이 길면 ? 아이콘이 화면 오른쪽 끝에 붙어, 아이콘 옆에 띄운 설명은 화면 밖으로 나갑니다. 그래서 설명을 제목 줄 아래에 제목과 같은 왼쪽 끝부터 띄우고, 폭을 header(@container) 폭인 100cqw 이하로 줄입니다. */}
            <span
              aria-hidden
              className="pointer-events-none invisible absolute top-full left-0 z-10 mt-2 w-max max-w-[min(32rem,100cqw)] rounded-field bg-neutral px-3 py-2 text-sm leading-snug break-keep text-neutral-content opacity-0 shadow-lg transition-opacity group-hover/help:visible group-hover/help:opacity-100 group-has-focus-visible/help:visible group-has-focus-visible/help:opacity-100"
            >
              {help}
            </span>
          </span>
        )}
        {count !== undefined && (
          <span className="font-mono text-sm text-base-content/45 tabular-nums">{count}</span>
        )}
        {loading && (
          <span
            className="loading loading-spinner loading-xs text-base-content/40"
            aria-label={messages.common.loading}
          />
        )}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
