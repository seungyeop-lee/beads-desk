import type { ReactNode } from "react";

type Props = {
  title: string;
  /** 상단 탭과 같은 화면 색입니다. tone-* class를 넘깁니다. */
  tone: string;
  count?: number;
  loading?: boolean;
  description?: string;
  /** 제목 줄 오른쪽에 두는 조작입니다. */
  children?: ReactNode;
};

/** 화면 맨 위의 제목 줄입니다. */
export function ScreenHeader({ title, tone, count, loading, description, children }: Props) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 pt-10 pb-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className={`tone-dot ${tone} size-3`} />
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="font-mono text-sm text-base-content/45 tabular-nums">{count}</span>
          )}
          {loading && (
            <span
              className="loading loading-spinner loading-xs text-base-content/40"
              aria-label="불러오는 중"
            />
          )}
        </div>
        {description && <p className="text-sm text-base-content/55">{description}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
