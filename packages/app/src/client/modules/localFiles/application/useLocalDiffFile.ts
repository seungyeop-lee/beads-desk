import { useEffect, useState, useSyncExternalStore } from "react";
import {
  loadDiffWrapPreference,
  saveDiffWrapPreference,
  subscribeDiffWrapPreference,
} from "@/client/infra/localFiles/diffWrapPreferenceStore";
import { readLocalTextFile } from "@/client/infra/localFiles/localFileApiClient";
import { type DiffPreview, diffPreview } from "@/client/modules/markdown/domain/diffPreview";

/**
 * diff 화면이 읽는 파일의 크기 상한입니다. 본문에서 펼쳐 보는 상한(FILE_PREVIEW_MAX_BYTES)보다 넓은 화면에서 큰 diff도 읽을 수 있게
 * 더 크게 두되, 파일 API가 텍스트 파일을 언제나 전체로 보내므로 브라우저가 멈추지 않을 만큼으로 묶습니다.
 */
export const LOCAL_DIFF_MAX_BYTES = 5 * 1024 * 1024;

/** diff 화면에 그릴 내용입니다. 파일 diff로 나눌 수 없는 글은 text로 둡니다. */
export type LocalDiffFile =
  | { status: "loading" }
  | { status: "diff"; preview: DiffPreview }
  | { status: "text"; text: string }
  | { status: "tooLarge" }
  | { status: "failed"; error: string };

/** 파일 API 주소(localFileUrl)의 diff 파일을 한 번 읽어 파일 diff로 나눕니다. 주소가 바뀌면 다시 읽습니다. */
export function useLocalDiffFile(url: string): LocalDiffFile {
  const [loaded, setLoaded] = useState<{ url: string; file: LocalDiffFile } | null>(null);

  useEffect(() => {
    let active = true;
    void readLocalTextFile(url, LOCAL_DIFF_MAX_BYTES).then((file) => {
      if (!active) return;
      if (file.status !== "loaded") return setLoaded({ url, file });
      const preview = diffPreview(file.text);
      setLoaded({
        url,
        file: preview ? { status: "diff", preview } : { status: "text", text: file.text },
      });
    });
    return () => {
      active = false;
    };
  }, [url]);

  return loaded?.url === url ? loaded.file : { status: "loading" };
}

/**
 * diff 화면에서 긴 줄을 줄바꿈해 보일지와 그 선택을 바꾸는 함수입니다. 선택은 browser에 남아 다음에 diff 화면을 열 때도 유지됩니다.
 * 서버가 그리는 화면과 hydration 때는 기본값(줄바꿈)으로 그리고, 그 뒤에 남긴 선택으로 바꿉니다.
 */
export function useDiffWrap(): [boolean, (on: boolean) => void] {
  const wrap = useSyncExternalStore(
    subscribeDiffWrapPreference,
    loadDiffWrapPreference,
    () => true,
  );
  return [wrap, saveDiffWrapPreference];
}
