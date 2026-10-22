import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

export function HumanGateReason({
  reason,
  headingLevel = 3,
}: {
  reason: string;
  headingLevel?: 3 | 4;
}) {
  const messages = useMessages();
  const Heading = headingLevel === 3 ? "h3" : "h4";
  if (!reason) return null;
  return (
    <section className="flex flex-col gap-1 text-sm" aria-label={messages.humanGate.reason}>
      <Heading className="font-semibold">{messages.humanGate.reason}</Heading>
      <MarkdownEditor readOnly openAddress={tabMarkdownUrl} value={reason} />
    </section>
  );
}
