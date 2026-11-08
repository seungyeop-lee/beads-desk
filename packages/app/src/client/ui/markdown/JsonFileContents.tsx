import { useEffect, useRef } from "react";
import type { JsonFileFormat } from "@/client/modules/markdown/domain/jsonFileText";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { jsonFileView } from "./jsonFileView";

export function JsonFileContents({ text, format }: { text: string; format: JsonFileFormat }) {
  const container = useRef<HTMLDivElement>(null);
  const labels = useMessages().markdownEditor;
  useEffect(() => {
    const element = container.current!;
    element.replaceChildren(jsonFileView(text, format, labels));
    return () => element.replaceChildren();
  }, [text, format, labels]);
  return <div ref={container} />;
}
