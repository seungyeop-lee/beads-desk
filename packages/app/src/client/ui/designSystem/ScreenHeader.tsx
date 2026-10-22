import { useId, type ReactNode } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HelpTooltip } from "./HelpTooltip";

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
  const countId = useId();
  return (
    <header className="@container flex flex-wrap items-end gap-x-6 gap-y-3 pt-4">
      <div className="relative flex min-w-0 items-center gap-3">
        {tone && <span className={`tone-dot ${tone} size-3`} />}
        <h1
          className="text-2xl font-bold tracking-tight"
          aria-describedby={count !== undefined ? countId : undefined}
        >
          {title}
        </h1>
        {/* 설명은 이 div 아래에 제목과 같은 왼쪽 끝부터 띄우고, 폭은 header(@container) 폭 이하로 줄입니다. */}
        {help && <HelpTooltip help={help} />}
        {count !== undefined && (
          <span id={countId} className="font-mono text-sm text-emphasis-50 tabular-nums">
            {count}
          </span>
        )}
        {loading && (
          <span
            className="loading loading-spinner loading-xs text-emphasis-40"
            aria-label={messages.common.loading}
          />
        )}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
