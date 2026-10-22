import { parseIssues, type Issue } from "./issue";
import { runBdJson, type BdOutcome } from "./runBd";

/** bd 목록 명령의 기본 개수 제한(list 50, ready 100)에 걸려 목록이 조용히 잘리지 않도록 제한을 없앱니다. 0이 제한 없음입니다. */
const LIST_LIMIT = "0";

/** 목록을 읽는 bd 명령에 제한 없음 인자를 붙입니다. `tail` 인자는 제한 인자 뒤에 둡니다. */
export function withNoLimit(command: string[], tail: string[] = []): string[] {
  return [...command, "--limit", LIST_LIMIT, ...tail];
}

/** 이슈 목록을 읽는 bd 명령을 실행하고 출력을 이슈로 해석합니다. */
export async function queryIssues(cwd: string, args: string[]): Promise<BdOutcome<Issue[]>> {
  const result = await runBdJson(cwd, args);
  return result.ok ? { ok: true, value: parseIssues(result.value) } : result;
}
