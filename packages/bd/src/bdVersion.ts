import { runBdChecked } from "./runBd";

/** 설치된 bd의 버전을 돌려줍니다. bd 실행이 실패하면 null을 돌려줍니다. */
export async function bdVersion(cwd: string): Promise<string | null> {
  const result = await runBdChecked(cwd, ["version"]);
  return result.ok ? result.value.trim() : null;
}
