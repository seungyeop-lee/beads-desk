import { documentMessages } from "@/client/infra/locale/documentLocale";

export type LocalTextFile =
  | { status: "loaded"; text: string }
  | { status: "tooLarge" }
  | { status: "failed"; error: string };

/**
 * 로컬 파일 API 주소(localFileUrl)의 파일을 UTF-8 글자로 읽습니다.
 * 파일 API는 텍스트 파일을 Range 없이 전체로, Content-Length 없이 chunk로 보내므로, 받은 크기가 maxBytes를 넘는 순간
 * 받기를 멈추고 tooLarge를 돌려줍니다.
 * 허용 범위 밖이거나 없는 파일이면 서버가 보낸 오류 문구를 돌려줍니다.
 */
export async function readLocalTextFile(url: string, maxBytes: number): Promise<LocalTextFile> {
  const unreachable = (): LocalTextFile => ({
    status: "failed",
    error: documentMessages().common.serverUnreachable,
  });
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return unreachable();
  }
  try {
    if (!response.ok) return { status: "failed", error: await response.text() };
    return await readWithin(response.body, maxBytes);
  } catch {
    return unreachable();
  }
}

async function readWithin(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<LocalTextFile> {
  if (!body) return { status: "loaded", text: "" };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { status: "loaded", text: text + decoder.decode() };
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { status: "tooLarge" };
    }
    text += decoder.decode(value, { stream: true });
  }
}
