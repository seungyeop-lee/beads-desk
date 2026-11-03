import { LOGO_BEADS } from "./logoBeads";

/** 머리글 왼쪽의 구슬과 앱 이름입니다. 감싸는 요소가 flex로 둘을 나란히 놓습니다. */
export function AppLogo() {
  return (
    <>
      <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
        {LOGO_BEADS.map(({ tone }) => (
          <span key={tone} className={`tone-dot ${tone} size-2`} />
        ))}
      </span>
      <span className="text-body font-bold tracking-tight">beads-desk</span>
    </>
  );
}
