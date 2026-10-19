import type { RenderOptions } from "pele/lazy";

type ApplyPreview = (preview: string | HTMLElement | null) => void;

async function renderDiagram(content: string, options: RenderOptions) {
  const { renderAsync } = await import("pele/lazy");
  return (await renderAsync(content, options)).svg;
}

export function createMermaidPreview(root: HTMLElement, loading: string) {
  let disposed = false;
  return {
    renderPreview(language: string, content: string, apply: ApplyPreview) {
      if (language.toLowerCase() !== "mermaid") return null;
      const id = crypto.randomUUID();
      const placeholder = document.createElement("div");
      placeholder.dataset.mermaidPreview = id;
      placeholder.textContent = loading;
      apply(placeholder);
      // callback에는 블록 식별자가 없어, 현재 미리보기 표지가 남아 있는 요청만 반영합니다.
      const current = () =>
        !disposed && root.querySelector(`[data-mermaid-preview="${id}"]`) !== null;
      // pele는 넘겨받은 글꼴로 글자 폭을 재서 노드 크기를 정합니다. 그림이 그려질 때 쓰는 --pele-font와 다르면
      // 글자가 노드 크기에 맞지 않으므로, 같은 값을 읽어 넘깁니다.
      const style = getComputedStyle(root);
      void renderDiagram(content, {
        idPrefix: `mermaid-${id}`,
        fontFamily: style.getPropertyValue("--pele-font").trim(),
        fontFamilyMono: style.getPropertyValue("--pele-font-mono").trim(),
      }).then(
        (svg) => {
          if (current()) apply(`<div data-mermaid-preview="${id}">${svg}</div>`);
        },
        () => {
          if (current()) apply(null);
        },
      );
      return undefined;
    },
    dispose() {
      disposed = true;
    },
  };
}
