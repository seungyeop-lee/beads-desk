export const LOCAL_FILES_PATH = "/api/local-files";

export function localFileUrl(path: string): string {
  return `${LOCAL_FILES_PATH}?${new URLSearchParams({ path })}`;
}
