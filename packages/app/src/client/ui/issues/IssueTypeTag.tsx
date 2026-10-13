import { typeLabel, typeTone } from "./issueLabels";

export function IssueTypeTag({ issueType }: { issueType: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`tone-dot ${typeTone(issueType)}`} />
      {typeLabel(issueType)}
    </span>
  );
}
