import { useEffect, useState } from "react";
import { readIssueTextMatches } from "@/client/infra/issues/issueApiClient";
import { useWorkspaceRead } from "@/client/modules/workspace/application/useWorkspaceRead";
import type { IssueTextHits } from "@/client/modules/issues/domain/issueListView";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/** 글자마다 bd를 실행하면 bd 실행 줄이 길어지므로, 입력이 이만큼 멈춘 뒤에 본문과 댓글을 검색합니다. */
const SETTLE_MS = 300;

export type IssueTextMatches = {
  /** 지금 검색어로 찾은 결과가 아직 없으면 undefined입니다. 앞 검색어로 찾은 이슈가 섞이지 않게 합니다. */
  matches: IssueTextHits | undefined;
  /** matches를 찾은 검색어입니다. 앞뒤 공백을 뺀 값이라, 화면이 발췌 안에서 서버와 같은 검색어로 맞은 곳을 찾습니다. */
  term: string;
  error: string | null;
};

/** 본문 필드나 댓글에 search가 든 이슈와 맞은 곳을 읽고, workspace가 바뀌면 다시 읽습니다. */
export function useIssueTextMatches(search: string): IssueTextMatches {
  const text = search.trim();
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(text), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const { data, error } = useWorkspaceRead(settled, readMatches);
  const current = settled === text;
  return {
    matches: current ? (data ?? undefined) : undefined,
    term: text,
    error: current ? error : null,
  };
}

async function readMatches(text: string): Promise<ApiResponse<IssueTextHits | null>> {
  if (text === "") return { ok: true, data: null };
  const result = await readIssueTextMatches(text);
  return result.ok
    ? { ok: true, data: new Map(result.data.map(({ id, hits }) => [id, hits])) }
    : result;
}
