/**
 * 화면 route의 body 배치입니다. 컴포넌트 테스트도 이 디렉터리의 layout fixture(`*.testkit.tsx`)로 같은 값을 써서 화면을 앱과 같은 배치에서 검사합니다.
 * body는 창 높이를 최소 높이로만 가져 내용만큼 길어집니다. body 높이를 창 높이로 고정하면 sticky인 AppHeader가
 * body 상자 안에서만 붙어 있어서, 한 화면 넘게 스크롤할 때 body 끝과 함께 밀려 올라갑니다.
 * 남은 창 높이를 채워야 하는 화면은 그 화면의 main이 정합니다(BoardScreen).
 */
export const APP_BODY_LAYOUT = "flex min-h-dvh flex-col [&>main]:w-full";
