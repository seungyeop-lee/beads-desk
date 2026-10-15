import type { IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { epicsFirst } from "@/client/modules/issues/domain/issuePicker";
import {
  dependencyToAdd,
  notRelationCandidate,
  RELATION_KINDS,
  type RelationKind,
} from "@/client/modules/issues/domain/issueRelations";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { addDependencyAction } from "@/server/web/issues/issueActions";
import { IssuePicker } from "../IssuePicker";

/** 지금 이슈를 기준으로 관계를 고르고, 제목이나 id로 찾은 이슈와 그 관계를 맺습니다. */
export function RelationAddForm({ issue, writes }: { issue: IssueDetail; writes: IssueWrites }) {
  const messages = useMessages();
  const headingId = useId();
  const [kind, setKind] = useState<RelationKind>("blockedBy");
  const linked = new Set([
    issue.id,
    ...issue.dependencies.map((link) => link.id),
    ...issue.dependents.map((link) => link.id),
  ]);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="caption">
        {messages.relations.title}
      </h3>
      <select
        className="select select-sm w-full"
        aria-label={messages.relations.kind}
        value={kind}
        onChange={(event) => setKind(event.target.value as RelationKind)}
      >
        {RELATION_KINDS.map((option) => {
          const name = messages.relations.kinds[option];
          const hint = messages.relations.kindHints[option];
          return (
            <option key={option} value={option}>
              {hint ? `${name} (${hint})` : name}
            </option>
          );
        })}
      </select>
      <IssuePicker
        label={messages.relations.search}
        disabled={writes.pending}
        exclude={notRelationCandidate(kind, linked)}
        rank={kind === "parent" ? epicsFirst : undefined}
        onPick={async (other) => {
          const { issueId, dependsOnId, type } = dependencyToAdd(kind, issue.id, other.id);
          const result = await writes.run(() => addDependencyAction(issueId, dependsOnId, type));
          if (result.ok)
            showToast(messages.relations.linked(other.id, messages.relations.kinds[kind]));
          return result.ok;
        }}
      />
    </section>
  );
}
