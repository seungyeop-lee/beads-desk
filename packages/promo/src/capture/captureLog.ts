/**
 * 녹화 디렉터리의 `captureLog.json` 형태입니다. 소개 영상을 만드는 쪽이 녹화 파일을 고르고,
 * 장면 도중에 실행한 bd 명령을 터미널 애니메이션으로 녹화와 같은 순간에 보여 줄 때 읽습니다.
 *
 * 시각은 모두 그 장면의 녹화를 시작한 순간부터 지난 밀리초입니다. 녹화 파일의 첫 frame이 0에 해당합니다.
 */
export type CaptureLog = {
  /** 캡처를 실행한 시각(ISO 8601)입니다. */
  capturedAt: string;
  /** 브라우저 viewport의 CSS 픽셀 크기이자 녹화 파일의 해상도입니다. */
  viewport: { width: number; height: number };
  /** 스크린샷에만 적용됩니다. 녹화는 deviceScaleFactor와 관계없이 viewport 해상도로 저장됩니다. */
  deviceScaleFactor: number;
  /** 캡처 대상 목록(captureTargets.ts)의 순서와 같습니다. */
  scenes: SceneLog[];
};

export type SceneLog = {
  /** 캡처 대상의 이름입니다. */
  name: string;
  /** 녹화 파일 이름입니다. `captureLog.json`과 같은 디렉터리에 있습니다. */
  video: string;
  /** 장면 도중에 데모 workspace에서 실행한 bd 명령입니다. 실행한 순서대로 놓이고, 없으면 빈 배열입니다. */
  bdCommands: BdCommandLog[];
};

export type BdCommandLog = {
  /** `bd` 뒤에 붙인 인자입니다. 터미널에 보일 명령은 `bd ${args.join(" ")}`이고, 공백이 든 인자는 따옴표로 감싸 보입니다. */
  args: string[];
  /** bd가 표준 출력에 쓴 내용입니다. */
  stdout: string;
  /** 명령을 실행하기 시작한 시각입니다. */
  startMs: number;
  /** 명령이 끝난 시각입니다. */
  endMs: number;
  /** 명령의 결과가 화면에 나타난 시각입니다. 서버가 DB 변경을 알아채고 화면이 다시 조회한 뒤입니다. */
  shownMs: number;
};
