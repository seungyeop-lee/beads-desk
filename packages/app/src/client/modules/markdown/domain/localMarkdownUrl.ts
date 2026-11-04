import { WINDOWS_DRIVE_PATH } from "./drivePath";
import { filePreviewFormat } from "./filePreview";
import {
  localDiffScreenPath,
  localFileOf,
  localFilePathOf,
  localFileUrl,
  localTextScreenPath,
} from "@/shared/contract/localFiles";
import { SCREEN_PATHS } from "@/shared/domain/screenPaths";
import { workspaceHref } from "@/shared/contract/workspaces";

// 화면 경로(`/epics`)는 문서를 보는 workspace의 화면으로 잇고, 그 밖의 앱 경로는 URL로 유지합니다.
// 나머지 절대경로와 Windows 드라이브 경로는 로컬 파일로 엽니다.
const APP_ROOTS: ReadonlySet<string> = new Set(["/w", "/api", "/_next"]);

/** 화면 경로와 로컬 파일은 문서를 보는 workspace를 기준으로 열므로, 그 workspace의 이름을 함께 받습니다. */
export function localMarkdownUrl(url: string, workspace: string): string {
  const path = decodedPath(url);
  if (WINDOWS_DRIVE_PATH.test(path)) return localFileUrl(path, workspace);
  const root = url.split(/[?#]/, 1)[0]!.split("/").slice(0, 2).join("/");
  if (!url.startsWith("/") || url.startsWith("//") || APP_ROOTS.has(root)) return url;
  if (SCREEN_PATHS.has(root)) return workspaceHref(workspace, url);
  return localFileUrl(path, workspace);
}

/**
 * 본문 링크를 새 탭에서 열지 정합니다. `address`는 localMarkdownUrl이 바꾼 주소입니다.
 * 로컬 파일과 외부 웹 주소는 새 탭에서 열어 보던 화면을 남기고, 앱 화면 주소는 지금 탭에서 이동합니다.
 */
export function opensInNewTab(address: string): boolean {
  return localFilePathOf(address) !== null || /^(https?:)?\/\//i.test(address);
}

/**
 * 로컬 파일 링크를 눌렀을 때 여는 주소입니다. `address`는 localMarkdownUrl이나 localFileUrl이 만든 주소입니다.
 * 본문에서 펼쳐 볼 수 있는 형식(filePreviewFormat)의 파일은 원문 대신 주소에 담긴 workspace의 화면을 엽니다.
 * .diff·.patch 파일은 diff 화면을, 마크다운과 일반 텍스트 파일은 텍스트 화면을 열고, 그 밖의 주소는 그대로 돌려줍니다.
 * 본문에서 펼쳐 보기와 두 화면의 원문 링크는 같은 파일 API 주소로 원문을 읽으므로, 파일 API가 redirect하지 않고 링크 주소를 바꿉니다.
 */
export function localFileLinkUrl(address: string): string {
  const file = localFileOf(address);
  const format = filePreviewFormat(address);
  if (!file || !format) return address;
  const screenPath =
    format === "diff" ? localDiffScreenPath(file.path) : localTextScreenPath(file.path);
  return workspaceHref(file.workspace, screenPath);
}

function decodedPath(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}
