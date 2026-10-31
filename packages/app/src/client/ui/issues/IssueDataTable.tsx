import type { ReactNode } from "react";

const COLUMNS = {
  issues:
    "[--priority-column:8rem] [--labels-column:9rem] [--trailing-columns:calc(var(--status-column)_+_var(--priority-column)_+_var(--labels-column)_+_var(--dependency-column)_+_var(--unblocks-column))]",
  decisions:
    "[--supersession-column:18rem] [--created-on-column:9rem] [--trailing-columns:calc(var(--status-column)_+_var(--supersession-column)_+_var(--created-on-column))]",
};

/**
 * 제목 열은 표 폭에서 고정 열의 폭을 뺀 나머지를 차지합니다. 표는 64rem까지 넓히되,
 * 영역이 더 좁으면 영역 폭에 뒤쪽 열의 폭만 더해 ID와 제목이 영역 안에 남게 합니다.
 * 각 열의 머리 칸과 폭 계산은 같은 CSS 변수를 읽습니다.
 */
export function IssueDataTable({
  variant,
  epicOrder = false,
  unblocks = false,
  children,
}: {
  variant: keyof typeof COLUMNS;
  epicOrder?: boolean;
  /** issues 표의 맨 뒤에 닫으면 바로 풀리는 수 열을 두면 true입니다. */
  unblocks?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="@container surface min-w-0 max-w-full overflow-x-auto">
      <table
        className={`table [--id-column:6rem] [--status-column:8rem] ${COLUMNS[variant]} ${variant === "issues" ? `${epicOrder ? "[--dependency-column:7rem]" : "[--dependency-column:5rem]"} ${unblocks ? "[--unblocks-column:6rem]" : "[--unblocks-column:0rem]"}` : ""} w-[max(100cqw,min(100cqw_+_var(--trailing-columns),64rem))] table-fixed`}
      >
        {children}
      </table>
    </div>
  );
}
