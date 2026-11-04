import { useEffect, useState } from "react";
import {
  type LocalTextFile,
  readLocalTextFile,
} from "@/client/infra/localFiles/localFileApiClient";

/**
 * 텍스트 화면이 읽는 파일의 크기 상한입니다. diff 화면처럼 본문에서 펼쳐 보는 상한(FILE_PREVIEW_MAX_BYTES)보다 크게 두되,
 * 파일 API가 텍스트 파일을 언제나 전체로 보내므로 브라우저가 멈추지 않을 만큼으로 묶습니다.
 */
export const LOCAL_TEXT_MAX_BYTES = 5 * 1024 * 1024;

/** 파일 API 주소(localFileUrl)의 마크다운·텍스트 파일을 한 번 읽습니다. 주소가 바뀌면 다시 읽습니다. */
export function useLocalTextFile(url: string): LocalTextFile | { status: "loading" } {
  const [loaded, setLoaded] = useState<{ url: string; file: LocalTextFile } | null>(null);

  useEffect(() => {
    let active = true;
    void readLocalTextFile(url, LOCAL_TEXT_MAX_BYTES).then((file) => {
      if (active) setLoaded({ url, file });
    });
    return () => {
      active = false;
    };
  }, [url]);

  return loaded?.url === url ? loaded.file : { status: "loading" };
}
