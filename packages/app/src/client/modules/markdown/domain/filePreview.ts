import { localFilePathOf } from "@/shared/contract/localFiles";

/**
 * diff는 추가·삭제 줄을 칠해 보이고, markdown은 렌더링하지 않은 원문에 구문 강조를 입혀 보이고, plain은 원문 그대로 보입니다.
 */
export type FilePreviewFormat = "diff" | "markdown" | "plain";

const FORMATS: ReadonlyMap<string, FilePreviewFormat> = new Map([
  ["diff", "diff"],
  ["patch", "diff"],
  ["md", "markdown"],
  ["log", "plain"],
  ["txt", "plain"],
]);

/**
 * 본문을 펼쳐 볼 수 있는 파일의 크기 상한입니다. 파일 API는 텍스트 파일을 언제나 전체로 보내므로,
 * 이보다 큰 파일은 받아 오지 않아 브라우저가 느려지지 않게 합니다.
 */
export const FILE_PREVIEW_MAX_BYTES = 1024 * 1024;

/** 로컬 파일 API 주소(localFileUrl)가 여는 파일을 본문에서 펼쳐 볼 수 있으면 그 형식을, 아니면 null을 돌려줍니다. */
export function filePreviewFormat(address: string): FilePreviewFormat | null {
  const path = localFilePathOf(address);
  const extension = path?.match(/\.([^./\\]+)$/)?.[1]?.toLowerCase();
  return extension ? (FORMATS.get(extension) ?? null) : null;
}
