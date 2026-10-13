import type { Issue } from "@beads-desk/bd/issue";
import { useEffect, useState } from "react";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { watchIssueList } from "./issueListWatch";

export type IssueListState = {
  /** 아직 한 번도 받지 못했으면 null입니다. 다시 읽다 실패하면 마지막으로 받은 목록을 유지합니다. */
  issues: Issue[] | null;
  error: string | null;
  /** filter를 바꾼 뒤 새 목록을 아직 받지 못한 상태입니다. */
  loading: boolean;
};

type Loaded = { filter: IssueListFilter; issues: Issue[] | null; error: string | null };

/** filter는 렌더링마다 새로 만들지 말고 state로 유지해 넘깁니다. 바뀔 때마다 다시 구독합니다. */
export function useIssueList(filter: IssueListFilter): IssueListState {
  const [loaded, setLoaded] = useState<Loaded>({ filter, issues: null, error: null });

  useEffect(
    () =>
      watchIssueList(filter, (result) =>
        setLoaded((previous) =>
          result.ok
            ? { filter, issues: result.data, error: null }
            : {
                filter,
                issues: previous.filter === filter ? previous.issues : null,
                error: result.error,
              },
        ),
      ),
    [filter],
  );

  const current = loaded.filter === filter;
  return {
    issues: current ? loaded.issues : null,
    error: current ? loaded.error : null,
    loading: !current || (loaded.issues === null && loaded.error === null),
  };
}
