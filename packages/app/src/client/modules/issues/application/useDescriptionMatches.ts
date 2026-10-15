import { useEffect, useState } from "react";
import { readDescriptionMatches } from "@/client/infra/issues/issueApiClient";
import { useWorkspaceRead } from "@/client/modules/workspace/application/useWorkspaceRead";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/** 글자마다 bd를 실행하면 bd 실행 줄이 길어지므로, 입력이 이만큼 멈춘 뒤에 설명을 검색합니다. */
const SETTLE_MS = 300;

export type DescriptionMatches = {
  /** 지금 검색어로 찾은 결과가 아직 없으면 undefined입니다. 앞 검색어로 찾은 이슈가 섞이지 않게 합니다. */
  matches: ReadonlySet<string> | undefined;
  error: string | null;
};

/** 설명에 search가 든 이슈의 id를 읽고, workspace가 바뀌면 다시 읽습니다. */
export function useDescriptionMatches(search: string): DescriptionMatches {
  const text = search.trim();
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(text), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const { data, error } = useWorkspaceRead(settled, readMatches);
  const current = settled === text;
  return { matches: current ? (data ?? undefined) : undefined, error: current ? error : null };
}

async function readMatches(text: string): Promise<ApiResponse<ReadonlySet<string> | null>> {
  if (text === "") return { ok: true, data: null };
  const result = await readDescriptionMatches(text);
  return result.ok ? { ok: true, data: new Set(result.data) } : result;
}
