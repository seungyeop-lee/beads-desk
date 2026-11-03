import { useEffect, useState } from "react";
import { readLocalFolder } from "@/client/infra/localFiles/localFolderApiClient";
import type { LocalFolderPage } from "@/shared/contract/localFiles";

export type LocalFolder = {
  /** 지금 폴더에서 받은 항목입니다. 아직 받지 못했으면 null이고, 더 읽는 동안에는 받은 항목을 그대로 둡니다. */
  listing: LocalFolderPage | null;
  error: string | null;
  loading: boolean;
  /** 받은 항목 다음 묶음을 읽어 뒤에 붙입니다. */
  showMore: () => void;
};

type Loaded = {
  path: string;
  listing: LocalFolderPage | null;
  error: string | null;
  readingMore: boolean;
};

/**
 * path 폴더의 항목을 첫 묶음부터 읽고, showMore를 부를 때마다 다음 묶음을 이어 붙입니다.
 * 파일 시스템이 바뀌어도 다시 읽지 않습니다. 새로고침하거나 다른 폴더로 옮기면 첫 묶음부터 다시 읽습니다.
 */
export function useLocalFolder(path: string): LocalFolder {
  const [loaded, setLoaded] = useState<Loaded>({
    path,
    listing: null,
    error: null,
    readingMore: false,
  });

  useEffect(() => {
    let active = true;
    void readLocalFolder(path, null).then((result) => {
      if (!active) return;
      setLoaded(
        result.ok
          ? { path, listing: result.data, error: null, readingMore: false }
          : { path, listing: null, error: result.error, readingMore: false },
      );
    });
    return () => {
      active = false;
    };
  }, [path]);

  const current = loaded.path === path;
  const showMore = () => {
    const { listing } = loaded;
    if (!current || !listing?.next || loaded.readingMore) return;
    setLoaded({ ...loaded, error: null, readingMore: true });
    void readLocalFolder(path, listing.next).then((result) =>
      // 그 사이 다른 폴더로 옮겼거나 첫 묶음부터 다시 읽었으면 이 결과를 버립니다.
      setLoaded((previous) => {
        if (previous.listing !== listing) return previous;
        if (!result.ok) return { ...previous, error: result.error, readingMore: false };
        const { entries, total, next } = result.data;
        return {
          path,
          listing: { entries: [...listing.entries, ...entries], total, next },
          error: null,
          readingMore: false,
        };
      }),
    );
  };

  return {
    listing: current ? loaded.listing : null,
    error: current ? loaded.error : null,
    loading: !current || (loaded.listing === null && loaded.error === null) || loaded.readingMore,
    showMore,
  };
}
