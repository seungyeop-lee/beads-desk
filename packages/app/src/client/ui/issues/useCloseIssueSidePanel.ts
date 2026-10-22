import { useRouter } from "next/navigation";

/** 옆 패널이 열려 있으면 닫기 링크와 같은 주소를 history에 쌓고, Escape 한 단계를 처리했다고 알립니다. */
export function useCloseIssueSidePanel(closeHref: string | null) {
  const router = useRouter();
  return () => {
    if (closeHref === null) return false;
    router.push(closeHref, { scroll: false });
    return true;
  };
}
