// 앱과 같은 Tailwind·daisyUI 스타일을 적용해야 실제 화면과 같은 배치로 검사할 수 있습니다.
// 프로덕션 빌드는 라이브러리 CSS 청크를 앱 CSS보다 먼저 연결하므로, 라이브러리 CSS를 불러 오는 화면(예: 그래프의
// @xyflow/react)은 라이브러리 CSS를 앱 CSS보다 먼저 주입해야 같은 명시도 규칙의 계산값이 프로덕션과 같아집니다.
// 브라우저 테스트의 CSS는 모듈 실행 순서대로 head 끝에 붙으므로, 라이브러리 CSS를 앱 CSS보다 먼저 적어 순서를 맞춥니다.
import "@xyflow/react/dist/style.css";
import "./src/client/ui/designSystem/styles/index.css";
