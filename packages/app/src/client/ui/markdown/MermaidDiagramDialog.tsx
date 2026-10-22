import { useEffect, useRef, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { CloseIcon } from "../designSystem/icons";
import { cloneDiagram } from "./mermaidPreview";
import { ModalBackdrop, useShowModal } from "../designSystem/modal";

type Props = {
  /** 편집기 안에 그려진 그림을 감싼 요소입니다. dialog는 그 SVG를 복제해 그립니다. */
  diagram: HTMLElement;
  onClose: () => void;
};

/**
 * Mermaid 그림을 화면을 거의 채우는 dialog에 크게 보여 줍니다.
 * 그림은 칸에 맞춰 늘리되 pele가 정한 원래 크기보다 작게 줄이지 않으므로, 원래 크기가 칸보다 크면 스크롤해서 봅니다.
 */
export function MermaidDiagramDialog({ diagram, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const messages = useMessages();

  useEffect(() => {
    const svg = cloneDiagram(diagram);
    // pele가 넣은 max-width와 height:auto는 칸 폭에 맞춰 줄이는 규칙이라 지우고, 늘리는 크기는 CSS에 맡깁니다.
    svg.style.removeProperty("max-width");
    svg.style.removeProperty("height");
    svg.style.minWidth = `${svg.width.baseVal.value}px`;
    svg.style.minHeight = `${svg.height.baseVal.value}px`;
    canvasRef.current?.replaceChildren(svg);
  }, [diagram]);

  useShowModal(dialogRef);

  // portal로 그려도 React 이벤트는 React tree를 따라 편집기의 상위 component로 전달됩니다.
  // 이 dialog를 닫을 때 생기는 submit, cancel, close가 편집기를 감싼 form이나 dialog에 닿으면
  // 작성 중인 내용을 저장하거나 그 dialog를 닫으므로, 여기서 전달을 멈춥니다.
  const stop = (event: SyntheticEvent) => event.stopPropagation();

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={messages.markdownEditor.enlargedDiagram}
      onSubmit={stop}
      onCancel={stop}
      onClose={(event) => {
        stop(event);
        onClose();
      }}
    >
      <div className="mermaid-diagram-dialog modal-box flex h-[94dvh] max-h-none w-[96vw] max-w-none flex-col overflow-hidden p-0">
        <header className="flex shrink-0 justify-end border-b border-base-300 px-3 py-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-base-content/60"
            aria-label={messages.common.close}
            onClick={() => dialogRef.current?.close()}
          >
            <CloseIcon />
          </button>
        </header>
        <div ref={canvasRef} className="min-h-0 flex-1 overflow-auto bg-base-200 p-6" />
      </div>
      <ModalBackdrop />
    </dialog>,
    document.body,
  );
}
