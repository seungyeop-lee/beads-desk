import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** react-markdown은 기본 설정에서 원문 HTML을 렌더링하지 않으므로 이슈 본문을 그대로 넘겨도 됩니다. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
