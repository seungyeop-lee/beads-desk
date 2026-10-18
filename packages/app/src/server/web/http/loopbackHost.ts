const LOOPBACK_HOSTS: Record<string, true> = {
  localhost: true,
  "127.0.0.1": true,
  "[::1]": true,
};

/** Host 헤더가 포트를 떼고 localhost, 127.0.0.1, [::1] 중 하나인지 확인합니다. 헤더가 없으면 false입니다. */
export function isLoopbackHost(host: string | null): boolean {
  if (host === null) return false;
  // Host 헤더의 IPv6는 [::1]:3000처럼 괄호로 감싸므로 포트를 뗄 때 형식을 나눕니다.
  const name = host.toLowerCase();
  const hostname = name.startsWith("[")
    ? name.slice(0, name.indexOf("]") + 1)
    : name.replace(/:\d+$/, "");
  return LOOPBACK_HOSTS[hostname] === true;
}
