import { useCallback, useMemo, useState } from "react";
import { documentMessages } from "@/client/infra/locale/documentLocale";
import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export type IssueWrites = {
  /** 쓰기 요청이 진행 중입니다. */
  pending: boolean;
  /** 마지막으로 실패한 쓰기의 오류 문구입니다. */
  error: string | null;
  dismissError: () => void;
  /**
   * Server Action을 실행하고 결과를 돌려줍니다. 실패하면 error에 문구를 남깁니다.
   * write는 이 탭이 보는 workspace의 이름을 받아 Server Action에 그대로 넘깁니다.
   */
  run: <R extends ApiResponse<unknown>>(write: (workspace: string) => Promise<R>) => Promise<R>;
};

/**
 * 쓰기가 성공하면 서버가 SSE로 변경을 알리고, 보고 있는 화면이 다시 조회해 결과를 보여 줍니다.
 * 그래서 쓰기 결과로 화면 데이터를 직접 고치지 않습니다.
 */
export function useIssueWrites(): IssueWrites {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <R extends ApiResponse<unknown>>(write: (workspace: string) => Promise<R>) => {
      setPending((count) => count + 1);
      setError(null);
      let result: R;
      try {
        // workspace 화면 밖에서는 빈 이름을 보내 서버가 등록하지 않은 workspace로 거부하게 합니다.
        result = await write(documentWorkspace() ?? "");
      } catch {
        // 서버가 꺼졌거나, 새로 빌드한 서버에 이전 화면이 요청해 Server Action을 찾지 못한 경우입니다.
        result = { ok: false, error: documentMessages().common.requestFailed } as R;
      } finally {
        setPending((count) => count - 1);
      }
      if (!result.ok) setError(result.error);
      return result;
    },
    [],
  );

  const dismissError = useCallback(() => setError(null), []);
  // 값이 바뀔 때만 새 객체를 돌려줘, 이 객체를 받는 memo component가 다시 그려지지 않게 합니다.
  return useMemo(
    () => ({ pending: pending > 0, error, dismissError, run }),
    [pending, error, dismissError, run],
  );
}
