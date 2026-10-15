"use client";

import { useId, useMemo } from "react";
import { useGraph } from "@/client/modules/graph/application/useGraph";
import { executionOrder } from "@/client/modules/graph/domain/executionOrder";
import { filterGraphIssues } from "@/client/modules/graph/domain/graphFilter";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { ExecutionOrderGraph } from "./ExecutionOrderGraph";
import { GraphFilterBar } from "./GraphFilterBar";
import { GRAPH_TABS } from "./graphAddress";
import { useGraphAddress } from "./useGraphAddress";

/**
 * 이슈 사이의 관계를 관점별 탭으로 그립니다. 탭과 필터는 주소에 둡니다.
 * 이슈 상세 dialog와 주소 조건이 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function GraphScreen() {
  const { address, changeAddress } = useGraphAddress();
  const { data, error, loading } = useGraph(address.includeClosed);
  const issueHref = useIssueHref();
  const messages = useMessages();
  const tabsId = useId();

  const epics = useMemo(
    () =>
      (data?.issues ?? [])
        .filter((issue) => issue.issueType === "epic")
        .sort((a, b) => a.title.localeCompare(b.title)),
    [data],
  );
  const order = useMemo(
    () =>
      data ? executionOrder(filterGraphIssues(data.issues, address), data.dependencies) : null,
    [data, address],
  );

  // 그래프는 안에서 끌고 확대해 보므로, AppHeader(h-14와 아래 border 1px)를 뺀 화면 높이 안에 페이지를 맞춰 세로 스크롤이 생기지 않게 합니다.
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem-1px)] max-w-[96rem] flex-col gap-4 px-8 pb-6">
      <ScreenHeader
        title={messages.graph.title}
        tone={screenTone("/graph")}
        help={messages.graph.help[address.tab]}
        compact
        loading={loading}
      />

      <div role="tablist" aria-label={messages.graph.tabList} className="tabs tabs-border">
        {GRAPH_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${tabsId}-${tab}`}
            aria-selected={address.tab === tab}
            className={`tab ${address.tab === tab ? "tab-active" : ""}`}
            onClick={() => changeAddress({ tab })}
          >
            {messages.graph.tabs[tab]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`${tabsId}-${address.tab}`}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <GraphFilterBar address={address} epics={epics} onChange={changeAddress} />

        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{messages.graph.loadFailed(error)}</span>
          </div>
        )}

        {order && order.unrelated > 0 && (
          <p className="text-sm text-base-content/55">
            {messages.graph.unrelated(order.unrelated)}
          </p>
        )}
        {order &&
          (order.components.length > 0 ? (
            <ExecutionOrderGraph order={order} issueHref={issueHref} />
          ) : (
            <p className="rounded-box border border-dashed border-base-300 px-6 py-10 text-center text-sm text-base-content/55">
              {messages.graph.empty}
            </p>
          ))}
      </div>

      <IssueDetailRoute />
    </main>
  );
}
