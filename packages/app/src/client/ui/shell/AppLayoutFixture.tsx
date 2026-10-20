import type { ReactNode } from "react";
import { APP_BODY_LAYOUT } from "./appBodyLayout";

/**
 * 컴포넌트 테스트에서 화면을 앱의 body 배치 안, sticky AppHeader 자리 아래에 그립니다.
 * 머리글 자리는 xl 너비의 AppHeader처럼 높이 h-14에 아래 border 1px이고, `app-header` test id로 찾습니다.
 */
export function AppLayoutFixture({ children }: { children: ReactNode }) {
  return (
    <div className={APP_BODY_LAYOUT}>
      <div
        data-testid="app-header"
        className="sticky top-0 z-20 h-14 shrink-0 border-b border-base-300 bg-base-100"
      />
      {children}
    </div>
  );
}
