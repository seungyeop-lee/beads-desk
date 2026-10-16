import type { ReactNode } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HelpIcon } from "./icons";

type Props = {
  title: ReactNode;
  /** 상단 탭과 같은 화면 색입니다. tone-* class를 넘깁니다. 상단 탭에 없는 화면은 넘기지 않습니다. */
  tone?: string;
  count?: number;
  loading?: boolean;
  description?: string;
  /** 제목 옆 ? 아이콘에 올리거나 초점을 두면 보이는 설명입니다. 화면 높이가 아까운 화면에서 description 대신 씁니다. */
  help?: string;
  /** 화면 높이를 채우는 화면에서 제목 줄 위아래 여백을 줄입니다. */
  compact?: boolean;
  /** 제목 줄 오른쪽에 두는 조작입니다. */
  children?: ReactNode;
};

/** 화면 맨 위의 제목 줄입니다. */
export function ScreenHeader({
  title,
  tone,
  count,
  loading,
  description,
  help,
  compact,
  children,
}: Props) {
  const messages = useMessages();
  return (
    <header
      className={`flex flex-wrap items-end gap-x-6 gap-y-3 ${compact ? "pt-6 pb-0" : "pt-10 pb-6"}`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-3">
          {tone && <span className={`tone-dot ${tone} size-3`} />}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {help && (
            <span className="tooltip tooltip-right" data-tip={help}>
              <button
                type="button"
                className="btn btn-circle btn-ghost btn-xs text-base-content/45"
                aria-label={help}
              >
                <HelpIcon width={16} height={16} />
              </button>
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
        {description && <p className="text-sm text-base-content/55">{description}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
