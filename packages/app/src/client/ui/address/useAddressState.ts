import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * 화면 조건을 주소에서 읽고, 바꾼 조건을 주소에 남깁니다.
 * 주소는 router.replace가 끝난 뒤에야 바뀌므로 바꾼 조건을 먼저 화면에 반영합니다.
 * 주소만 읽어 그리면 입력이 주소가 바뀔 때까지 이전 값으로 되돌아가고, 연달아 바꾼 값이 앞의 값을 덮어씁니다.
 * 탭, 뒤로 가기, 다른 화면의 링크로 주소가 바뀌면 주소의 조건을 다시 따릅니다.
 * read와 href는 module 수준 함수처럼 바뀌지 않는 함수를 넘깁니다.
 */
export function useAddressState<T>(
  read: (params: URLSearchParams) => T,
  href: (value: T) => string,
): [T, (value: T) => void] {
  const router = useRouter();
  const query = useSearchParams().toString();
  const [seenQuery, setSeenQuery] = useState(query);
  const [value, setValue] = useState(() => read(new URLSearchParams(query)));
  if (seenQuery !== query) {
    setSeenQuery(query);
    setValue(read(new URLSearchParams(query)));
  }

  const change = (changed: T) => {
    setValue(changed);
    router.replace(href(changed), { scroll: false });
  };
  return [value, change];
}
