import { HelpIcon } from "./icons";

/**
 * ? 아이콘과, 아이콘에 마우스를 올리거나 키보드 초점을 두면 보이는 설명입니다. 아이콘의 접근 가능한 이름이 설명입니다.
 * 설명은 가장 가까운 positioned 조상의 바로 아래에 그 왼쪽 끝부터 띄우고, 폭은 가장 가까운 @container의 폭 이하로 줄입니다.
 * 아이콘 옆에 띄우면 아이콘이 화면 오른쪽 끝에 있을 때 설명이 화면 밖으로 나가므로, 감싸는 쪽에서 두 조상을 정해 둡니다.
 */
export function HelpTooltip({ help }: { help: string }) {
  return (
    <span className="group/help">
      <button
        type="button"
        className="btn btn-circle btn-ghost btn-xs text-base-content/45"
        aria-label={help}
      >
        <HelpIcon width={16} height={16} />
      </button>
      <span
        aria-hidden
        className="pointer-events-none invisible absolute top-full left-0 z-10 mt-2 w-max max-w-[min(32rem,100cqw)] rounded-field bg-neutral px-3 py-2 text-sm leading-snug break-keep text-neutral-content opacity-0 shadow-lg transition-opacity group-hover/help:visible group-hover/help:opacity-100 group-has-focus-visible/help:visible group-has-focus-visible/help:opacity-100"
      >
        {help}
      </span>
    </span>
  );
}
