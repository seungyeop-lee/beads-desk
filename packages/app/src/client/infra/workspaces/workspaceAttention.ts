// 사용자가 보고 있는 탭은 그 workspace 이름으로 시작하는 shared lock을 쥡니다. 판단 기다림 알림은 SSE 연결을 연 탭 하나가
// 띄울지 정하므로, 그 탭은 lock 목록으로 다른 탭에서 보고 있는 workspace까지 알아냅니다.
// 탭이 닫히면 브라우저가 lock을 풀어서, 닫힌 탭이 보던 workspace가 계속 보고 있는 것으로 남지 않습니다.
const ATTENTION_LOCK_PREFIX = "beads-desk.workspace-attention:";

/** 이 탭이 화면에 보이고 focus를 가진 동안 workspace의 lock을 쥡니다. 반환한 함수를 부르면 lock을 놓고 더 따라가지 않습니다. */
export function holdWorkspaceAttention(workspace: string): () => void {
  let release: AbortController | null = null;
  const update = () => {
    const attending = document.visibilityState === "visible" && document.hasFocus();
    if (attending === (release !== null)) return;
    if (release) {
      release.abort();
      release = null;
      return;
    }
    const controller = new AbortController();
    release = controller;
    navigator.locks
      .request(
        ATTENTION_LOCK_PREFIX + workspace,
        { mode: "shared", signal: controller.signal },
        () =>
          new Promise<void>((resolve) =>
            controller.signal.addEventListener("abort", () => resolve(), { once: true }),
          ),
      )
      // lock을 얻기 전에 focus를 잃어 요청을 취소했습니다.
      .catch(() => {});
  };
  update();
  window.addEventListener("focus", update);
  window.addEventListener("blur", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    window.removeEventListener("focus", update);
    window.removeEventListener("blur", update);
    document.removeEventListener("visibilitychange", update);
    release?.abort();
  };
}

/** 사용자가 지금 보고 있는 workspace입니다. 이 탭과 다른 탭을 모두 보며, 아무 탭도 보고 있지 않으면 비어 있습니다. */
export async function attendedWorkspaces(): Promise<string[]> {
  const { held = [] } = await navigator.locks.query();
  return held.flatMap(({ name }) =>
    name?.startsWith(ATTENTION_LOCK_PREFIX) ? [name.slice(ATTENTION_LOCK_PREFIX.length)] : [],
  );
}
