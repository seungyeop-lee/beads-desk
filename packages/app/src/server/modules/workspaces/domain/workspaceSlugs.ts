/**
 * 등록 순서대로 받은 workspace 디렉터리마다 화면 주소에 쓸 이름을 정합니다.
 * 이름은 디렉터리 이름에서 주소에 그대로 쓸 수 없는 문자를 `_`로 바꾼 것입니다. 앞에서 이미 쓴 이름과 겹치면
 * `-2`, `-3`처럼 번호를 붙입니다. 먼저 등록한 workspace가 이름을 그대로 가지므로, 뒤에 workspace를 등록해도
 * 앞 workspace의 주소는 바뀌지 않습니다.
 */
export function assignWorkspaceSlugs(roots: readonly string[]): string[] {
  const used = new Set<string>();
  return roots.map((root) => {
    const base = slugBase(root);
    let slug = base;
    for (let suffix = 2; used.has(slug); suffix += 1) slug = `${base}-${suffix}`;
    used.add(slug);
    return slug;
  });
}

// 한글처럼 주소에 percent-encoding으로 쓸 수 있는 글자는 주소창에서 그대로 읽히므로 남깁니다.
// macOS는 한글 파일 이름을 자모로 나눠(NFD) 돌려줄 때가 있어, 주소에서 같은 글자로 보이도록 NFC로 합칩니다.
function slugBase(root: string): string {
  const name = root.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  const slug = name.normalize("NFC").replace(/[^\p{L}\p{M}\p{N}._-]/gu, "_");
  // `.`과 `..`은 브라우저가 경로 이동으로 해석합니다.
  return /^\.*$/.test(slug) ? slug.replace(/\./g, "_") || "_" : slug;
}
