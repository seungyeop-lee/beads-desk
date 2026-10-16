import type { IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { notReplacementTarget } from "@/client/modules/issues/domain/issueRelations";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { closeAsReplacedAction } from "@/server/web/issues/issueActions";
import { REPLACEMENTS, type Replacement } from "@/shared/contract/issueActions";
import { IssuePicker } from "../IssuePicker";

/** 지금 이슈를 고른 이슈로 대체하거나 고른 이슈의 중복으로 표시해 닫습니다. */
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
        exclude={notReplacementTarget(issue)}
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
