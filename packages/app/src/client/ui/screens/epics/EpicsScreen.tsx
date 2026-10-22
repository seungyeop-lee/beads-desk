"use client";

import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { useEpicsView } from "@/client/modules/epics/application/useEpicsView";
import { useGateTitles } from "@/client/modules/gates/application/useGateTitles";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { SearchField } from "@/client/ui/designSystem/SearchField";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { EpicGroupSection } from "./EpicGroupSection";
import { EpicSection } from "./EpicSection";

/**
 * epic마다 하위 이슈 진행률을 보여 주고, 펼친 epic은 하위 이슈를 목록처럼 바로 고칠 수 있게 보여 줍니다.
 * 열린 에픽과 닫힌 에픽을 묶음으로 나누고, 처음에는 닫힌 묶음만 접어 둡니다.
 * 검색하는 동안에는 맞은 에픽만 보이고, 묶음과 맞은 하위 에픽이 속한 카드를 펼칩니다. 이때 접고 편 것은 그 검색어에서만 유지하므로,
 * 검색어를 지우면 사용자가 검색 전에 정해 둔 펼침 상태로 돌아갑니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function EpicsScreen() {
  const view = useEpicsView();
  const gateTitles = useGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <ScreenFrame>
      <ScreenHeader
        title={messages.epics.title}
        tone={screenTone("/epics")}
        count={view.cards?.length}
        loading={view.loading || writes.pending}
      >
        <SearchField
          label={messages.epics.search}
          placeholder={messages.epics.searchPlaceholder}
          value={view.search}
          onChange={view.setSearch}
          className="w-64 max-w-full"
        />
      </ScreenHeader>

      {view.error && <ErrorAlert>{messages.epics.loadFailed(view.error)}</ErrorAlert>}
      <WriteErrorAlert writes={writes} />

      {view.empty ? (
        <EmptyState message={messages.epics.empty} />
      ) : (
        view.noMatches && <EmptyState message={messages.epics.noMatches} />
      )}

      {view.groups.map((group) => (
        <EpicGroupSection
          key={group.kind}
          kind={group.kind}
          count={group.epics.length}
          expanded={view.groupExpanded(group.kind)}
          onToggle={() => view.toggleGroup(group.kind)}
        >
          {group.epics.map((summary) => (
            <EpicSection
              key={summary.epic.id}
              summary={summary}
              expanded={view.epicExpanded(summary.epic.id)}
              onToggle={() => view.toggle(summary.epic.id)}
              revealed={view.revealed}
              gateTitles={gateTitles}
              issueHref={issueHref}
              writes={writes}
            />
          ))}
        </EpicGroupSection>
      ))}

      <IssueDetailRoute />
    </ScreenFrame>
  );
}
