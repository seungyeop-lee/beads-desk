import { HelpIcon } from "./icons";

type HelpTooltipProps = {
  help: string;
  /** 설명 상자를 아이콘의 가까운 positioned 조상 아래에 두는 기본 배치 대신, 화면 오른쪽 위(모달 header 아래)에 맞춰 둡니다. */
  placement?: "below" | "header-end";
};

/**
 * ? 아이콘과, 아이콘에 마우스를 올리거나 키보드 초점을 두면 보이는 설명입니다. 아이콘의 접근 가능한 이름이 설명입니다.
 * 기본 배치는 가장 가까운 positioned 조상의 바로 아래에 그 왼쪽 끝부터 띄우고, 폭은 가장 가까운 @container의 폭 이하로 줄입니다.
 * 아이콘 옆에 띄우면 아이콘이 화면 오른쪽 끝에 있을 때 설명이 화면 밖으로 나가므로, 감싸는 쪽에서 두 조상을 정해 둡니다.
 */
export function HelpTooltip({ help, placement = "below" }: HelpTooltipProps) {
  const headerEnd = placement === "header-end";
  return (
    <span className={`group/help ${headerEnd ? "shrink-0" : ""}`}>
      <button
        type="button"
        className={
          headerEnd
            ? "btn btn-ghost btn-sm btn-square"
            : "btn btn-circle btn-ghost btn-xs text-emphasis-50"
        }
        aria-label={help}
      >
        <HelpIcon width={16} height={16} />
      </button>
      <span
        aria-hidden
        className={`pointer-events-none invisible absolute z-10 w-max rounded-field bg-neutral px-3 py-2 text-sm leading-snug text-neutral-content shadow-lg group-hover/help:visible group-has-focus-visible/help:visible ${
          headerEnd
            ? "top-16 right-5 max-w-[min(32rem,calc(96vw-2.5rem))]"
            : "top-full left-0 mt-2 max-w-[min(32rem,100cqw)] break-keep opacity-0 transition-opacity group-hover/help:opacity-100 group-has-focus-visible/help:opacity-100"
        }`}
      >
        {help}
      </span>
    </span>
  );
}
