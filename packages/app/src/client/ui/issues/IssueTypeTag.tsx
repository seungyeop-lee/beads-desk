import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { typeLabel, typeTone } from "./issueLabels";

export function IssueTypeTag({ issueType }: { issueType: string }) {
  const messages = useMessages();
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`tone-dot ${typeTone(issueType)}`} />
      {typeLabel(messages, issueType)}
    </span>
  );
}
