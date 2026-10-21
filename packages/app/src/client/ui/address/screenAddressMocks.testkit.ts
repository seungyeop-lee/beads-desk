/**
 * 컴포넌트 테스트가 `next/navigation`과 `@/client/ui/issues/IssueDetailRoute`를 `vi.mock`으로 바꿀 때 쓰는 module입니다.
 * `vi.mock`은 파일 맨 위로 끌어올려져 실행되므로 factory 안에서 이 파일을 동적으로 import합니다.
 *
 * ```ts
 * vi.mock("next/navigation", async () =>
 *   (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({ screenPath: "/board" }),
 * );
 * ```
 *
 * 테스트 안에서 바꾸는 값은 그 값을 읽는 함수로 넘깁니다. factory가 실행될 때는 테스트 파일의 변수가 아직 초기화되지 않았을 수 있습니다.
 */

type Router = {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
};

export function nextNavigationMock({
  workspace = "demo",
  screenPath = "/",
  search = () => new URLSearchParams(),
  router,
}: {
  /** 탭이 보는 workspace 이름입니다. */
  workspace?: string | (() => string);
  /** workspace를 뗀 화면 경로(`/issues`)입니다. */
  screenPath?: string;
  /** 렌더링할 때마다 읽는 주소의 query입니다. */
  search?: () => URLSearchParams;
  /** 아무 일도 하지 않는 기본 router 함수 대신 쓸 함수입니다. */
  router?: Partial<Router>;
} = {}) {
  const slug = () => (typeof workspace === "function" ? workspace() : workspace);
  return {
    useParams: () => ({ workspace: slug() }),
    usePathname: () => `/w/${slug()}${screenPath}`,
    useSearchParams: () => search(),
    useRouter: (): Router => ({ push: () => {}, replace: () => {}, refresh: () => {}, ...router }),
  };
}

/** 상세 dialog를 그리지 않고, 이슈 링크는 화면 경로에 `issue` query를 붙인 주소로 만듭니다. */
export function issueDetailRouteMock(screenPath: string) {
  return {
    IssueDetailRoute: () => null,
    useIssueHref: () => (issueId: string) => `${screenPath}?issue=${issueId}`,
    useScreenDetailReady: () => true,
  };
}
