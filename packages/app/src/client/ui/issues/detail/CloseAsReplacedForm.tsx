import type { IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { closeAsReplacedAction } from "@/server/web/issues/issueActions";
import { REPLACEMENTS, type Replacement } from "@/shared/contract/issueActions";
import { IssuePicker } from "../IssuePicker";

/**
 * 지금 이슈를 고른 이슈로 대체하거나 고른 이슈의 중복으로 표시해 닫습니다.
 * 이 이슈가 이미 의존하는 이슈는 bd가 거부하므로 후보에서 뺍니다. 반대 방향으로 연결된 이슈는 고를 수 있습니다.
 */
export function CloseAsReplacedForm({
  issue,
  writes,
}: {
  issue: IssueDetail;
  writes: IssueWrites;
}) {
  const messages = useMessages();
  const headingId = useId();
  const [replacement, setReplacement] = useState<Replacement>("supersede");
  const unavailable = new Set([issue.id, ...issue.dependencies.map((link) => link.id)]);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="caption">
        {messages.closeAsReplaced.title}
      </h3>
      <select
        className="select select-sm w-full"
        aria-label={messages.closeAsReplaced.method}
        value={replacement}
        onChange={(event) => setReplacement(event.target.value as Replacement)}
      >
        {REPLACEMENTS.map((option) => (
          <option key={option} value={option}>
            {messages.closeAsReplaced.methods[option]}
          </option>
        ))}
      </select>
      <IssuePicker
        label={messages.closeAsReplaced.search}
        disabled={writes.pending}
        exclude={(candidate) => unavailable.has(candidate.id)}
        onPick={async (target) => {
          if (!window.confirm(messages.closeAsReplaced.confirm[replacement](issue.id, target.id))) {
            return false;
          }
          const result = await writes.run(() =>
            closeAsReplacedAction(issue.id, replacement, target.id),
          );
          if (result.ok)
            showToast(messages.closeAsReplaced.closed[replacement](issue.id, target.id));
          return result.ok;
        }}
      />
    </section>
  );
}
