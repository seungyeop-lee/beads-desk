import type { SiteContent } from "./types";

export const koContent: SiteContent = {
  locale: "ko",
  localeLabel: "한국어",
  skipToContent: "본문으로 건너뛰기",
  nav: {
    primaryLabel: "주요 탐색 메뉴",
    languageLabel: "언어 선택",
    features: "기능",
    requirements: "요구 사항",
    install: "시작하기",
    github: "GitHub",
    npm: "npm",
  },
  hero: {
    eyebrow: "Beads (bd) 전용 로컬 웹 UI",
    headline: "에이전트가 Beads에 남긴 기록을 브라우저에서 검토하세요.",
    subtitle:
      "에이전트가 세운 계획, 기록한 결정, Mermaid 다이어그램과 스크린샷, diff, 사람에게 남긴 질문을 한곳에서 읽고 고칩니다. 터미널의 bd 작업과도 그대로 함께 동작합니다.",
    primaryCta: "시작하기",
    secondaryCta: "GitHub에서 보기",
    quickStartTitle: "Beads workspace에서 바로 시작하기",
    installLabel: "npm으로 전역 설치",
    startLabel: "로컬 서버 실행 및 브라우저 열기",
    videoCaption:
      "지금 화면 상단의 마감일 목록과 병목 이슈를 확인하고, 오늘 마감 이슈의 blocks 그래프, Mermaid 시퀀스 다이어그램 확대, 첨부 스크린샷, 대체된 결정 기록까지 살펴보는 데모 영상입니다.",
    videoLabel: "beads-desk 데모 영상 (소리 없음)",
    videoPauseLabel: "일시정지",
    videoPlayLabel: "재생",
    videoPauseAriaLabel: "일시정지: 데모 영상 멈추기",
    videoPlayAriaLabel: "재생: 데모 영상 다시 재생",
  },
  copy: {
    buttonPrefix: "명령 복사:",
    copied: "복사됨",
    failed: "복사 실패",
  },
  featuresSection: {
    eyebrow: "핵심 기능",
    title: "bd CLI 흐름을 해치지 않고 에이전트 작업을 검토합니다",
    subtitle:
      "모든 읽기와 변경은 bd CLI를 거치며, 터미널에서 bd로 바꾼 내용도 몇 초 안에 열린 브라우저 탭에 반영됩니다.",
    enlargeLabel: "스크린샷 크게 보기",
    closeDialogLabel: "미리보기 닫기",
    items: [
      {
        id: "issues",
        badge: "Issues",
        tone: "azure",
        title: "작업 상태별로 모든 이슈 보기",
        summary:
          "이슈를 진행 중, 바로 작업 가능, 막힘, 보류, 닫힘 탭으로 묶어 보고, 병목 보기로도 바로 전환합니다.",
        bullets: [
          "유형, 라벨, 생성일·닫은 날짜, epic 미소속만 조건으로 좁히고, 소속 epic 링크로 바로 이동합니다.",
          "ID, 제목, 본문, 댓글까지 한 번에 검색하고 검색어가 나온 위치를 함께 보여 줍니다.",
          "이슈 상태와 우선순위를 목록에서 바로 바꿀 수 있습니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/issues.png",
            alt: "작업 상태별 탭, 필터, 유형 태그, 상태·우선순위 칩, 소속 에픽 링크가 표시된 이슈 화면",
            width: 2880,
            height: 1800,
            caption: "작업 상태 탭과 다중 필터, 인라인 상태 변경을 제공하는 이슈 화면",
          },
        ],
      },
      {
        id: "now-bottlenecks",
        badge: "Now & Bottlenecks",
        tone: "sand",
        title: "마감 임박 일감과 먼저 풀어야 할 병목 찾기",
        summary:
          "지금 화면에서는 마감일이 급한 이슈를 모으고, 병목 보기에서는 다른 작업을 가장 많이 막고 있는 이슈를 순서대로 드러냅니다.",
        bullets: [
          "Now는 마감일이 있는 열린 이슈를 기한 초과, 오늘 마감, 3일 이내 세 그룹으로 나눕니다.",
          "Bottlenecks는 기다리는 이슈가 많은 순으로 막고 있는 이슈를 정렬하고, 영향을 받는 마감일과 닫았을 때 풀리는 이슈 수를 알려 줍니다.",
          "진행 중·바로 작업 가능·막힌 이슈 수와 최근 7일 처리량 차트, 에픽 진행률도 같은 화면에서 확인합니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/now.png",
            alt: "기한 초과·오늘 마감·3일 이내 목록과 기다리는 이슈 수 순의 병목, 에픽 진행률이 표시된 지금 화면",
            width: 2880,
            height: 1440,
            caption: "마감일 그룹, 병목 순위, 최근 7일 차트, 에픽 진행률을 담은 지금 화면",
          },
        ],
      },
      {
        id: "graph",
        badge: "Graph",
        tone: "lavender",
        title: "계획을 단계별 그래프로 검토하기",
        summary:
          "에픽 안의 blocks 의존 관계가 몇 단계로 나뉘는지, human gate나 외부 이슈가 어디를 막고 있는지 한눈에 파악합니다.",
        bullets: [
          "에픽의 순서 보기는 blocks 관계에 따라 이슈를 단계별로 배치하고 현재 진행 중인 단계를 표시합니다.",
          "human gate와 에픽 밖에서 막고 있는 선행 이슈도 같은 그래프에 함께 나타납니다.",
          "어느 이슈에서든 선행·후속 그래프를 열어 앞뒤 연결 작업을 추적할 수 있습니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/graph.png",
            alt: "에픽 이슈들을 다섯 단계로 배치하고 마지막 단계를 human gate가 잡고 있는 순서 보기 그래프",
            width: 2880,
            height: 1440,
            caption: "외부 차단 이슈와 human gate까지 함께 보여 주는 단계별 순서 그래프",
          },
        ],
      },
      {
        id: "attachments-diff",
        badge: "Attachments & Diff",
        tone: "mint",
        title: "에이전트가 첨부한 다이어그램·로그·diff 읽기",
        summary:
          "설명과 댓글에 담긴 Markdown, Mermaid 다이어그램, 로컬 스크린샷·녹화, 패치 파일을 도구 전환 없이 바로 엽니다.",
        bullets: [
          "Markdown과 Mermaid 다이어그램을 렌더링하고 클릭해 크게 봅니다. 로컬 이미지와 .mp4·.webm 녹화도 이슈 안에서 재생합니다.",
          ".md, .txt, .log, .json, .jsonl 링크는 전용 텍스트 화면으로 열거나 문단 아래에 바로 펼치며, JSON은 Pretty와 원문을 오갈 수 있습니다.",
          ".diff와 .patch 링크는 바뀐 파일 트리와 긴 줄 줄바꿈, 단어 단위 변경 강조가 적용된 diff 화면으로 엽니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/attachments.png",
            alt: "Mermaid 시퀀스 다이어그램, 첨부된 결제 화면 스크린샷, 문단 아래 펼쳐진 Markdown 노트와 diff를 보여 주는 이슈 상세 화면",
            width: 2880,
            height: 3600,
            caption: "Mermaid 다이어그램, 로컬 이미지, 인라인으로 펼친 노트와 diff",
          },
          {
            src: "/media/screenshots/diff.png",
            alt: "왼쪽에 변경된 파일 트리가 있고 오른쪽에 긴 줄이 줄바꿈된 패치 본문이 표시된 diff 화면",
            width: 2880,
            height: 1800,
            caption: "변경 파일 트리와 줄바꿈 강조를 지원하는 전용 diff 화면",
          },
        ],
      },
      {
        id: "decisions",
        badge: "Decisions",
        tone: "lilac",
        title: "설계 결정과 대체 이력 추적하기",
        summary: "decision 타입 이슈만 따로 모아 현재 유효한 결정과 과거 결정을 구분해 관리합니다.",
        bullets: [
          "유효한 결정과 닫힌 결정을 나란히 구분해 정리합니다.",
          "결정마다 이전에 대체한 결정과 이후 새로 대체한 결정을 링크로 오가며 맥락을 확인합니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/decisions.png",
            alt: "유효한 결정과 닫힌 결정을 나누어 supersedes 및 superseded-by 링크를 보여 주는 결정 화면",
            width: 2880,
            height: 1800,
            caption: "대체 관계를 따라 과거 결정까지 함께 읽을 수 있는 결정 화면",
          },
        ],
      },
      {
        id: "needs-human",
        badge: "Needs human",
        tone: "coral",
        title: "사람의 판단을 기다리는 질문에 답하기",
        summary:
          "human 라벨 질문과 확인 요청(human gate)을 각 요청이 막고 있는 작업과 함께 모아 처리합니다.",
        bullets: [
          "사람에게 넘어온 질문과 human gate를, 그 gate가 막고 있는 후속 작업과 나란히 확인합니다.",
          "화면에서 바로 응답하거나 응답 없이 닫아 뒤에 기다리던 작업을 즉시 진행 상태로 풉니다.",
          "브라우저 알림을 켜 두면 다른 창에서 작업하는 중에도 새 요청이 들어올 때 바로 알 수 있습니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/needs-human.png",
            alt: "선택한 human gate에 응답을 입력하는 영역과 그 gate가 막고 있는 작업이 함께 표시된 판단 기다림 화면",
            width: 2880,
            height: 1800,
            caption: "선택한 gate와 차단된 작업을 한눈에 보고 즉시 응답하는 판단 기다림 화면",
          },
        ],
      },
      {
        id: "activity",
        badge: "Activity",
        tone: "sky",
        title: "자리를 비운 동안 생긴 변경 확인하기",
        summary:
          "workspace 전체의 생성, 닫힘, 댓글과 events journal 기반 수정·삭제 이력을 시간순으로 훑어봅니다.",
        bullets: [
          "workspace에서 이슈를 만들고 닫고 댓글을 단 기록을 최신순으로 나열합니다.",
          "bd config set events-journal true로 journal을 켜면 설명·상태·제목·라벨 수정과 삭제 이력까지 함께 보입니다.",
          "여기부터 지난번에 본 기록 구분선이 마지막으로 확인한 지점을 정확히 표시합니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/activity.png",
            alt: "오늘 생성·닫힘·댓글 기록과 여기부터 지난번에 본 기록 구분선이 표시된 활동 화면",
            width: 2880,
            height: 1800,
            caption: "마지막 방문 구분선으로 새 변경만 빠르게 훑는 활동 화면",
          },
        ],
      },
      {
        id: "hygiene",
        badge: "Hygiene",
        tone: "sage",
        title: "오래된 일감과 중복 이슈 정리하기",
        summary:
          "방치된 이슈, 커밋에 언급됐지만 닫히지 않은 이슈, 권장 섹션 누락, 중복 후보, 닫을 수 있는 에픽을 찾아냅니다.",
        bullets: [
          "오래 멈춘 이슈, 커밋에 언급된 미완료 이슈, bd 권장 섹션이 빠진 이슈를 자동으로 모읍니다.",
          "중복 후보를 비교하고 같은 화면에서 바로 중복으로 닫을 수 있습니다.",
          "하위 작업이 모두 끝나 닫을 수 있는 에픽도 한눈에 골라냅니다.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/hygiene.png",
            alt: "방치된 이슈, 중복 후보, 누락된 섹션, 닫을 수 있는 에픽, 고아 이슈가 정리된 정리 화면",
            width: 2880,
            height: 1800,
            caption: "중복 정리와 에픽 마무리를 돕는 트래커 정리 화면",
          },
        ],
      },
    ],
    alsoTitle: "함께 제공하는 기능",
    alsoItems: [
      {
        name: "Epics & Board",
        description:
          "열린 에픽과 닫힌 에픽을 진행률과 함께 검색하고, 보드에서 카드를 끌어 놓아 상태를 바꿉니다.",
      },
      {
        name: "옆 패널 (Side panel)",
        description:
          "지금 읽고 있는 이슈를 닫지 않고 바로 옆 패널에 연결된 이슈를 나란히 열어 봅니다.",
      },
      {
        name: "탭별 workspace 분리",
        description:
          "서버 하나만 띄워 두고도 브라우저 탭마다 서로 다른 bd workspace를 동시에 열 수 있습니다.",
      },
      {
        name: "3개 언어와 라이트·다크 테마",
        description: "설정에서 한국어, 영어, 일본어 화면 문구와 라이트·다크 테마를 전환합니다.",
      },
    ],
  },
  requirementsSection: {
    eyebrow: "요구 사항",
    title: "로컬 bd 환경만 있으면 바로 실행됩니다",
    items: [
      {
        label: "운영체제",
        detail:
          "macOS, Linux, Windows를 지원합니다. bd 1.3.1 기준으로 macOS와 GitHub Actions windows-latest에서 테스트했습니다.",
      },
      {
        label: "Node.js",
        detail: "Node.js 22 이상이 필요합니다.",
      },
      {
        label: "bd CLI",
        detail:
          "PATH에 bd가 있어야 하며, 다른 경로에 있으면 BD_BIN 환경 변수로 실행 파일 위치를 지정합니다(Windows npm 설치본은 자동 탐색).",
      },
      {
        label: "Beads workspace",
        detail: "bd init을 실행한 프로젝트 디렉터리가 필요합니다.",
      },
    ],
  },
  installSection: {
    eyebrow: "시작하기",
    title: "한 번 설치하고 어느 workspace에서나 바로 띄우세요",
    subtitle:
      "서버는 127.0.0.1에서만 요청을 받으므로 로컬 컴퓨터에서만 접근할 수 있으며, background에서 동작합니다.",
    steps: [
      {
        step: "01",
        title: "전역 패키지 설치",
        description: "npm 또는 pnpm으로 설치합니다.",
        commands: [
          { id: "install-npm", label: "npm", code: "npm install -g @seungyeop-lee/beads-desk" },
          { id: "install-pnpm", label: "pnpm", code: "pnpm add -g @seungyeop-lee/beads-desk" },
        ],
        note: "pnpm으로 전역 패키지를 처음 설치한다면 먼저 pnpm setup을 한 번 실행하고 새 셸을 여세요.",
      },
      {
        step: "02",
        title: "workspace 디렉터리에서 서버 시작",
        description:
          "Beads workspace 루트나 하위 디렉터리에서 실행하면 해당 workspace를 등록하고 브라우저를 엽니다.",
        commands: [{ id: "start-cmd", label: "CLI", code: "bd-desk start --open" }],
      },
    ],
    lifecycleTitle: "서버 관리",
    lifecycleItems: [
      {
        label: "중지",
        command: "bd-desk stop",
        detail: "백그라운드에서 실행 중인 서버를 종료합니다.",
      },
      {
        label: "업데이트",
        command: "bd-desk restart",
        detail: "설치 명령을 다시 실행한 뒤 서버를 재시작합니다.",
      },
      {
        label: "자세한 안내",
        detail:
          "명령 옵션, 다중 workspace, 브라우저 알림, 로컬 파일 링크, 문제 해결은 USAGE.ko.md에서 확인할 수 있습니다.",
      },
    ],
  },
  footer: {
    tagline:
      "Beads (bd) 이슈 트래커를 위한 로컬 우선 웹 UI입니다. 모든 읽기와 쓰기는 bd CLI를 통해 처리됩니다.",
    contributingTitle: "기여 안내",
    contributingText:
      "버그 제보와 기능 제안은 GitHub 이슈로 받고 있으며, pull request는 받지 않습니다.",
    contributingLinkText: "CONTRIBUTING.md 읽기",
    linksTitle: "문서 및 링크",
    usageGuideLabel: "사용 안내 (USAGE.ko.md)",
    usageGuideHref: "https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md",
    changelogLabel: "변경 내역",
    issuesLabel: "GitHub 이슈",
    licenseLabel: "MIT 라이선스",
    acknowledgementsPrefix: "",
    acknowledgementsLinkText: "mantoni/beads-ui",
    acknowledgementsSuffix: "에서 영감을 받아 만들었습니다.",
  },
};
