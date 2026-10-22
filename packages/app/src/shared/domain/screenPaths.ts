/**
 * workspace 이름 없이 화면을 가리키는 경로의 목록입니다.
 *
 * `/`는 workspace 루트, `/graph`는 탭에 없는 그래프 화면이고, 나머지는 상단 탭 화면의 경로입니다. markdown 링크의
 * 화면 경로 판정, workspace 이름 없는 예전 주소의 넘김(`[[...screen]]` route), 그래프 복귀 주소의 판정이 이 목록을
 * 씁니다. 탭 화면을 더하거나 빼면 이 목록에도 넣거나 빼야 하므로, 탭의 href는 모두 이 목록의 경로여야 합니다.
 */
const PATHS = [
  "/",
  "/graph",
  "/focus",
  "/human",
  "/activity",
  "/issues",
  "/epics",
  "/board",
  "/decisions",
  "/hygiene",
] as const;

/** `PATHS`의 경로입니다. 탭의 href 같은 화면 경로를 컴파일 때 이 목록에 묶어 두는 데 씁니다. */
export type ScreenPath = (typeof PATHS)[number];

export const SCREEN_PATHS: ReadonlySet<string> = new Set(PATHS);
