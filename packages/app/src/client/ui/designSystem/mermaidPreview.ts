type ApplyPreview = (preview: string | HTMLElement | null) => void;
type PreviewRequest = { id: string; content: string; apply: ApplyPreview; revision: number };

let rendering = Promise.resolve();

async function renderDiagram(
  id: string,
  content: string,
  dark: boolean,
  currentRequest: () => boolean,
): Promise<string | null> {
  const { default: mermaid } = await import("mermaid");
  let svg = "";
  // Mermaid의 전역 설정은 렌더링 도중에도 쓰이므로, 테마 설정과 렌더링을 함께 직렬화합니다.
  const current = rendering.then(async () => {
    if (!currentRequest()) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "default",
      suppressErrorRendering: true,
    });
    svg = (await mermaid.render(id, content)).svg;
  });
  rendering = current.catch(() => {});
  await current;
  return svg ? uniqueSvgIds(svg, id) : null;
}

function uniqueSvgIds(svg: string, prefix: string): string {
  // foreignObject의 HTML 줄바꿈은 XML로 다시 읽으면 뒤쪽 글자가 잘립니다.
  const template = document.createElement("template");
  template.innerHTML = svg;
  const fragment = template.content;
  const ids = new Map(
    Array.from(fragment.querySelectorAll("[id]"), (node) => [node.id, `${prefix}-${node.id}`]),
  );
  const references = (value: string) =>
    value.replace(/#([\w-]+)/g, (match, id: string) => (ids.has(id) ? `#${ids.get(id)}` : match));
  for (const node of fragment.querySelectorAll("*")) {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name === "id") attribute.value = ids.get(attribute.value) ?? attribute.value;
      else if (attribute.name === "aria-labelledby" || attribute.name === "aria-describedby")
        attribute.value = attribute.value
          .split(" ")
          .map((id) => ids.get(id) ?? id)
          .join(" ");
      else attribute.value = references(attribute.value);
    }
    if (node.tagName === "style") node.textContent = references(node.textContent ?? "");
  }
  return template.innerHTML;
}

export function createMermaidPreview(root: HTMLElement, loading: string) {
  const requests = new Map<string, PreviewRequest>();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => getComputedStyle(document.documentElement).colorScheme === "dark";
  let dark = isDark();
  let disposed = false;
  const present = (id: string) => root.querySelector(`[data-mermaid-preview="${id}"]`) !== null;
  const placeholder = (id: string) => {
    const element = document.createElement("div");
    element.dataset.mermaidPreview = id;
    element.textContent = loading;
    return element;
  };
  const prune = () => {
    for (const id of requests.keys()) if (!present(id)) requests.delete(id);
  };
  const render = (request: PreviewRequest) => {
    const revision = ++request.revision;
    request.apply(placeholder(request.id));
    // callback에는 블록 식별자가 없어, 현재 미리보기 표지가 남아 있는 요청만 반영합니다.
    const current = () => !disposed && request.revision === revision && present(request.id);
    void renderDiagram(`mermaid-${crypto.randomUUID()}`, request.content, dark, current).then(
      (svg) => {
        if (svg && current()) {
          request.apply(`<div data-mermaid-preview="${request.id}">${svg}</div>`);
        }
        prune();
      },
      () => {
        if (current()) request.apply(null);
        prune();
      },
    );
  };
  const themeChanged = () => {
    const next = isDark();
    if (next === dark) return;
    dark = next;
    for (const [id, request] of requests) {
      if (present(id)) render(request);
      else requests.delete(id);
    }
  };
  const observer = new MutationObserver(themeChanged);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", themeChanged);
  return {
    renderPreview(language: string, content: string, apply: ApplyPreview) {
      if (language.toLowerCase() !== "mermaid") return null;
      const request = { id: crypto.randomUUID(), content, apply, revision: 0 };
      requests.set(request.id, request);
      render(request);
      return undefined;
    },
    dispose() {
      disposed = true;
      requests.clear();
      observer.disconnect();
      media.removeEventListener("change", themeChanged);
    },
  };
}
