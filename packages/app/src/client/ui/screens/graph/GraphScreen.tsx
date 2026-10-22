"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { useQueryReplace } from "@/client/ui/address/useQueryReplace";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { useGraph } from "@/client/modules/graph/application/useGraph";
import { centerGraph } from "@/client/modules/graph/domain/centerGraph";
import { type GraphScope } from "@/client/modules/graph/domain/graphScope";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { HelpTooltip } from "@/client/ui/designSystem/HelpTooltip";
import { escapeStepHandlers, ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import {
  IssueDetailRoute,
  useIssueHref,
  useScreenDetailReady,
} from "@/client/ui/issues/IssueDetailRoute";
import {
  ISSUE_DETAIL_PARAMS,
  ISSUE_PARAM,
  SIDE_PARAM,
} from "@/client/ui/address/issueDetailParams";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { EdgeLegend } from "./EdgeLegend";
import { EpicPlanGraph } from "./EpicPlanGraph";
import { graphBackHref, readGraphScope } from "@/client/ui/address/graphAddress";
import { IssueGraph } from "./IssueGraph";
import { useGraphLayout } from "./useGraphLayout";

export function GraphScreen() {
  const params = useSearchParams();
  const scope = useMemo(() => readGraphScope(new URLSearchParams(params)), [params]);
  return scope && <GraphDialog scope={scope} />;
}

function GraphDialog({ scope }: { scope: GraphScope }) {
  const { data, error, loading } = useGraph();
  const issueHref = useIssueHref();
  const messages = useMessages();
  const params = useSearchParams();
  const router = useRouter();
  const replaceQueryOnly = useQueryReplace({ queryOnly: true });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const workspaceHref = useWorkspaceHref();
  const backHref = workspaceHref(graphBackHref(scope, new URLSearchParams(params)));
  const scopeTitle = data?.issues.find((issue) => issue.id === scope.id)?.title || scope.id;
  const title = `${scopeTitle} · ${messages.graph.scopes[scope.kind]}`;

  const screenDetailReady = useScreenDetailReady();
  useShowModal(dialogRef, screenDetailReady);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={title}
      onClose={() => router.replace(backHref, { scroll: false })}
      // Escape는 옆 패널, 상세, 그래프 순으로 한 단계씩 닫습니다. 옆 패널은 옆 패널의 닫기 단추처럼 history에 쌓아 닫습니다.
      {...escapeStepHandlers(() => {
        if (params.has(SIDE_PARAM)) {
          const next = new URLSearchParams(params);
          next.delete(SIDE_PARAM);
          router.push(`?${next}`, { scroll: false });
        } else if (params.has(ISSUE_PARAM)) {
          replaceQueryOnly((next) => {
            for (const name of ISSUE_DETAIL_PARAMS) next.delete(name);
          });
        } else return false;
        return true;
      })}
    >
      <div className="modal-box flex h-[94dvh] max-h-none w-[96vw] max-w-none flex-col overflow-hidden p-0">
        <header className="flex shrink-0 items-start gap-3 border-b border-base-300 px-5 py-3">
          <h1 className="min-w-0 flex-1 text-base leading-snug font-semibold wrap-anywhere">
            <Link
              href={issueHref(scope.id)}
              scroll={false}
              className="decoration-base-content/30 underline-offset-4 hover:underline"
            >
              {scopeTitle}
            </Link>
            <span className="text-base-content/50"> · {messages.graph.scopes[scope.kind]}</span>
          </h1>
          {loading && (
            <span
              className="loading loading-spinner loading-xs"
              aria-label={messages.common.loading}
            />
          )}
          <HelpTooltip help={messages.graph.help[scope.kind]} placement="header-end" />
          <Link
            href={backHref}
            scroll={false}
            className="btn btn-ghost btn-sm btn-square shrink-0"
            aria-label={messages.common.close}
          >
            <CloseIcon />
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          <div className="flex @container/plan min-h-[40rem] min-w-0 shrink-0 flex-1 flex-col gap-3 p-4 xl:min-h-0 xl:shrink">
            {error && <ErrorAlert>{messages.graph.loadFailed(error)}</ErrorAlert>}
            {data &&
              (scope.kind === "epic" ? (
                <EpicPlanGraph
                  key={`epic:${scope.id}`}
                  data={data}
                  epicId={scope.id}
                  issueHref={issueHref}
                />
              ) : (
                <BlockingChainGraph
                  key={`center:${scope.id}`}
                  data={data}
                  scope={scope}
                  issueHref={issueHref}
                />
              ))}
          </div>
          <IssueDetailRoute embedded />
        </div>
      </div>
      <ModalBackdrop />
    </dialog>
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
  const graph = useMemo(() => {
    const { order, extra, auxiliary } = centerGraph(data, scope.id);
    return {
      order,
      auxiliary: {
        center: data.issues.find(({ id }) => id === scope.id),
        issues: extra,
        edges: auxiliary,
      },
    };
  }, [data, scope]);
  const { layout, edgeLooks, measurement, ready } = useGraphLayout(
    graph.order,
    false,
    graph.auxiliary,
  );
  return (
    <>
      {measurement}
      {layout.nodes.length > 0 ? (
        <>
          <EdgeLegend edgeLooks={edgeLooks} auxiliary={graph.auxiliary.edges} />
          <IssueGraph
            layout={layout}
            edgeLooks={edgeLooks}
            ready={ready}
            issueHref={issueHref}
            centerId={scope.id}
          />
        </>
      ) : (
        <p className="rounded-box border border-dashed border-base-300 px-6 py-10 text-center text-sm text-base-content/55">
          {messages.graph.empty.center}
        </p>
      )}
    </>
  );
}
