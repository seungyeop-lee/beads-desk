import { useEffect, useState, type RefObject } from "react";
import type { RenderOptions } from "pele/lazy";

type ApplyPreview = (preview: string | HTMLElement | null) => void;

async function renderDiagram(content: string, options: RenderOptions) {
  const { renderAsync } = await import("pele/lazy");
  return (await renderAsync(content, options)).svg;
}

type Labels = { loading: string; enlarge: string };

/** 그려진 그림을 감싼 요소를 찾습니다. 그리는 중인 자리 표시에는 role이 없어 찾지 않으므로 누를 수 없습니다. */
const DIAGRAM_BUTTON = '[data-mermaid-preview][role="button"]';

export function createMermaidPreview(root: HTMLElement, { loading, enlarge }: Labels) {
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
          // 누르는 동작은 useEnlargedDiagrams가 편집기 root에서 받아 diagramAt으로 그림을 찾습니다.
          if (current())
            apply(
              `<div data-mermaid-preview="${id}" role="button" tabindex="0" aria-label="${enlarge}">${svg}</div>`,
            );
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

/** target이 그려진 그림 안에 있으면 그 그림을 감싼 요소를 돌려줍니다. 아니면 null입니다. */
function diagramAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(DIAGRAM_BUTTON) : null;
}

/**
 * diagramAt이 찾은 그림의 SVG를 복제합니다.
 * pele는 SVG 안의 id를 모두 idPrefix로 시작하게 만들므로, 복제본이 원래 그림과 같은 id를 갖지 않도록 접두어를 새로 바꿉니다.
 */
export function cloneDiagram(diagram: HTMLElement): SVGSVGElement {
  const clone = diagram.querySelector("svg")!.cloneNode(true) as SVGSVGElement;
  const prefix = `mermaid-${diagram.dataset.mermaidPreview}`;
  const renamed = `mermaid-${crypto.randomUUID()}`;
  for (const element of [clone, ...clone.querySelectorAll("*")]) {
    for (const attribute of element.attributes) {
      if (attribute.value.includes(prefix))
        attribute.value = attribute.value.replaceAll(prefix, renamed);
    }
  }
  return clone;
}

/**
 * `root` 안에서 누르거나 Enter나 Space로 고른 그림을 크게 보이게 할 대상으로 고르고, 그 그림을 돌려줍니다.
 * 그림은 Crepe가 sanitize해서 넣는 HTML이라 처리기를 붙일 수 없으므로, 그림을 누르는 동작을 편집기 root에서 받습니다.
 */
export function useEnlargedDiagrams(root: RefObject<HTMLElement | null>): {
  enlarged: HTMLElement | null;
  close: () => void;
} {
  const [enlarged, setEnlarged] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      const diagram = diagramAt(event.target);
      if (diagram) setEnlarged(diagram);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const diagram = diagramAt(event.target);
      if (!diagram || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      setEnlarged(diagram);
    };
    element.addEventListener("click", onClick);
    element.addEventListener("keydown", onKeyDown);
    return () => {
      element.removeEventListener("click", onClick);
      element.removeEventListener("keydown", onKeyDown);
    };
  }, [root]);

  return { enlarged, close: () => setEnlarged(null) };
}
