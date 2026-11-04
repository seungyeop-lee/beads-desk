import type { ComponentProps, ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { APP_BODY_LAYOUT } from "./appBodyLayout";
import { ViewerHeader } from "./ViewerHeader";

/**
 * 컴포넌트 테스트에서 화면을 앱의 body 배치 안, 실제 AppHeader 아래에 그립니다. 머리글은 `getByRole("banner")`로 찾습니다.
 * AppHeader가 서버에서 읽는 hook은 `vitest.browser.setup.ts`가 바꿔 두므로, 테스트는 `next/navigation`의 `useParams`·`usePathname`·`useRouter`와
 * `IssueDetailRoute`의 `useIssueHref`를 준비하고 `LocaleProvider` 안에서 이 fixture를 그립니다.
 */
export function AppLayoutFixture({ children }: { children: ReactNode }) {
  return (
    <div className={APP_BODY_LAYOUT}>
      <AppHeader />
      {children}
    </div>
  );
}

/** viewer 화면(diff, 폴더, 텍스트)을 앱처럼 ViewerHeader 아래에 그립니다. 테스트는 `next/navigation`의 `useParams`를 준비합니다. */
export function ViewerLayoutFixture({
  viewer,
  children,
}: ComponentProps<typeof ViewerHeader> & { children: ReactNode }) {
  return (
    <div className={APP_BODY_LAYOUT}>
      <ViewerHeader viewer={viewer} />
      {children}
    </div>
  );
}
