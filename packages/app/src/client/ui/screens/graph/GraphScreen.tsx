"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useGraph } from "@/client/modules/graph/application/useGraph";
import { centerGraph } from "@/client/modules/graph/domain/centerGraph";
import { type GraphScope } from "@/client/modules/graph/domain/graphScope";
import { CloseIcon, HelpIcon } from "@/client/ui/designSystem/icons";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { EpicPlanGraph } from "./EpicPlanGraph";
import { graphBackHref, readGraphScope } from "./graphAddress";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backHref = graphBackHref(scope, new URLSearchParams(params));
  const scopeTitle = data?.issues.find((issue) => issue.id === scope.id)?.title || scope.id;
  const title = `${scopeTitle} · ${messages.graph.scopes[scope.kind]}`;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={title}
      onClose={() => router.replace(backHref, { scroll: false })}
      onCancel={(event) => {
        event.preventDefault();
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
        if (params.has("issue")) {
          const next = new URLSearchParams(params);
          next.delete("issue");
          next.delete("side");
          router.replace(`?${next}`, { scroll: false });
        } else router.replace(backHref, { scroll: false });
      }}
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
          <span className="group/help shrink-0">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label={messages.graph.help[scope.kind]}
            >
              <HelpIcon />
            </button>
            <span
              aria-hidden
              className="pointer-events-none invisible absolute top-16 right-5 z-10 w-max max-w-[min(32rem,calc(96vw-2.5rem))] rounded-field bg-neutral px-3 py-2 text-sm leading-snug text-neutral-content shadow-lg group-hover/help:visible group-has-focus-visible/help:visible"
            >
              {messages.graph.help[scope.kind]}
            </span>
          </span>
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
            {error && (
              <div role="alert" className="alert alert-error alert-soft">
                <span>{messages.graph.loadFailed(error)}</span>
              </div>
            )}
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
      <form method="dialog" className="modal-backdrop">
        <button type="submit">{messages.common.close}</button>
      </form>
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
    const result = centerGraph(data, scope.id);
    return { ...result, issue: data.issues.find(({ id }) => id === scope.id) };
  }, [data, scope]);
  const { layout, measurement, ready } = useGraphLayout(graph.order, false, graph);
  return (
    <>
      {measurement}
      {layout.nodes.length > 0 ? (
        <>
          <div
            className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/65"
            aria-label={messages.graph.legend}
          >
            <span className="flex items-center gap-2">
              <span className="graph-legend-blocks w-8" />
              {messages.graph.blockingLegend}
            </span>
            <span className="flex items-center gap-2">
              <span className="graph-legend-related w-8" />
              {messages.graph.relatedLegend}
            </span>
            <span className="flex items-center gap-2">
              <span className="graph-legend-discovered w-8" />
              {messages.graph.discoveredLegend}
            </span>
          </div>
          <p className="text-xs text-base-content/55">{messages.graph.auxiliaryHint}</p>
          <IssueGraph
            layout={layout}
            ready={ready}
            issueHref={issueHref}
            centerId={scope.id}
            auxiliary={graph.auxiliary}
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
