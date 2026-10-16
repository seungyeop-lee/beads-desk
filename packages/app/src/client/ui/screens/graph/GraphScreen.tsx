"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useGraph } from "@/client/modules/graph/application/useGraph";
import { executionOrder } from "@/client/modules/graph/domain/executionOrder";
import { type GraphScope, scopedIssues } from "@/client/modules/graph/domain/graphScope";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { EpicPlanGraph } from "./EpicPlanGraph";
import { readGraphScope } from "./graphAddress";
import { layeredLayout } from "./graphLayout";
import { IssueGraph } from "./IssueGraph";

/**
 * 주소의 범위(에픽의 후손 이슈, 한 이슈의 앞뒤 blocks 사슬)를 blocks 실행 순서로 그립니다.
 * 그래프는 에픽 화면과 상세 dialog의 링크로만 열므로, 범위가 없는 주소는 따로 안내하지 않습니다.
 * 이슈 상세 dialog와 범위가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function GraphScreen() {
  const searchParams = useSearchParams();
  const scope = useMemo(() => readGraphScope(new URLSearchParams(searchParams)), [searchParams]);

  return (
    // 그래프는 안에서 끌고 확대해 보므로, AppHeader(h-14와 아래 border 1px)를 뺀 화면 높이 안에 페이지를 맞춰 세로 스크롤이 생기지 않게 합니다.
    <main className="mx-auto flex h-[calc(100dvh-3.5rem-1px)] max-w-[96rem] flex-col gap-4 px-8 pb-6">
      {scope && <ScopedGraph scope={scope} />}
      <IssueDetailRoute />
    </main>
  );
}

function ScopedGraph({ scope }: { scope: GraphScope }) {
  const { data, error, loading } = useGraph();
  const issueHref = useIssueHref();
  const messages = useMessages();

  const scopeTitle = data?.issues.find((issue) => issue.id === scope.id)?.title || scope.id;

  return (
    <>
      <ScreenHeader
        title={
          <>
            <Link
              href={issueHref(scope.id)}
              scroll={false}
              className="decoration-base-content/30 underline-offset-4 hover:underline"
            >
              {scopeTitle}
            </Link>
            <span className="text-base-content/45"> · {messages.graph.scopes[scope.kind]}</span>
          </>
        }
        help={messages.graph.help[scope.kind]}
        compact
        loading={loading}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.graph.loadFailed(error)}</span>
        </div>
      )}

      {data &&
        (scope.kind === "epic" ? (
          <EpicPlanGraph data={data} epicId={scope.id} issueHref={issueHref} />
        ) : (
          <BlockingChainGraph data={data} scope={scope} issueHref={issueHref} />
        ))}
    </>
  );
}

function BlockingChainGraph({
  data,
  scope,
  issueHref,
}: {
  data: GraphData;
  scope: GraphScope;
  issueHref: (issueId: string) => string;
}) {
  const messages = useMessages();
  const layout = useMemo(
    () => layeredLayout(executionOrder(scopedIssues(data, scope), data.dependencies)),
    [data, scope],
  );
  return layout.nodes.length > 0 ? (
    <IssueGraph layout={layout} issueHref={issueHref} centerId={scope.id} />
  ) : (
    <p className="rounded-box border border-dashed border-base-300 px-6 py-10 text-center text-sm text-base-content/55">
      {messages.graph.empty.center}
    </p>
  );
}
