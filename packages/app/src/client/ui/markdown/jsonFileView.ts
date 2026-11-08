import type { Messages } from "@/client/modules/locale/domain/messages";
import {
  type JsonFileFormat,
  type JsonRecord,
  prettyJsonRecords,
} from "@/client/modules/markdown/domain/jsonFileText";
import { highlightedFileText } from "./highlightedFileText";

/** Milkdown decoration과 React 텍스트 화면이 같은 표시·전환 규칙을 씁니다. */
export function jsonFileView(
  raw: string,
  format: JsonFileFormat,
  labels: Messages["markdownEditor"],
): HTMLElement {
  const view = document.createElement("div");
  view.className = "json-file-view code-colors";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-ghost btn-sm";
  const contents = document.createElement("div");
  contents.className = "json-file-records";
  view.append(toggle, contents);
  let pretty = true;
  let records: JsonRecord[] | undefined;
  const show = () => {
    toggle.textContent = pretty ? labels.showRaw : labels.showPretty;
    contents.replaceChildren();
    const displayed = pretty
      ? (records ??= prettyJsonRecords(raw, format))
      : [{ text: raw, valid: true }];
    for (const record of displayed) {
      const section = document.createElement("div");
      section.className = "json-file-record";
      if (!record.valid) {
        const notice = document.createElement("p");
        notice.className = "file-preview-message";
        notice.setAttribute("role", "alert");
        notice.textContent = labels.prettyUnavailable;
        section.append(notice);
      }
      const pre = document.createElement("pre");
      pre.tabIndex = 0;
      pre.textContent = record.text;
      section.append(pre);
      contents.append(section);
      void highlightedFileText(record.text, pretty ? "json" : format).then((fragment) =>
        pre.replaceChildren(fragment),
      );
    }
  };
  toggle.addEventListener("click", () => {
    pretty = !pretty;
    show();
  });
  show();
  return view;
}
