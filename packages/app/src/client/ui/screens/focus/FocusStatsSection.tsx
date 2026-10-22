import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from "recharts";
import {
  durationParts,
  type DailyFlow,
  type DurationStat,
  type FocusStats,
  type ValueCount,
} from "@/client/modules/focus/domain/focusStats";
import { localDate } from "@/client/modules/issues/domain/issueDateFilter";
import type { Messages } from "@/client/modules/locale/domain/messages";
import {
  nameTone,
  priorityLabel,
  priorityTone,
  typeLabel,
  typeTone,
  workStateTone,
} from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { issueViewHref } from "@/client/ui/screens/issues/issueListAddress";

import { screenTone } from "@/client/ui/shell/screenTabs";
import { FLOW_SERIES, flowBarHref, type FlowSeries } from "./flowBarAddress";

/**
 * 개수 카드 아래에 두는 통계입니다. 지금 할 일을 보이는 개수 카드와 시선을 다투지 않도록 색 배경 없이 작게 보입니다.
 * 카드 높이는 차트와 관계없이 정해지므로, 차트가 브라우저에서 크기를 잰 뒤에 그려져도 아래 목록이 밀리지 않습니다.
 * 창이 좁아 카드 글이 줄바꿈될 때만 카드가 최소 높이보다 커지고, 아래 목록도 그만큼 내려갑니다.
 */
export function FocusStatsSection({ stats }: { stats: FocusStats }) {
  const messages = useMessages();
  const text = messages.focus.stats;

  return (
    <section aria-label={text.title} className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-[15px] font-bold">
        {text.title}
        <span className="ml-auto flex gap-2">
          <SignalLink
            href={issueViewHref("deferred")}
            tone={workStateTone("deferred")}
            label={messages.workStates.labels.deferred}
            count={stats.deferred}
          />
          <SignalLink
            href="/hygiene"
            tone={screenTone("/hygiene")}
            label={text.closableEpics}
            count={stats.closableEpics}
          />
        </span>
      </h2>
      <div className="grid min-h-44 grid-cols-2 gap-3 lg:grid-cols-4">
        <ThroughputChart daily={stats.daily} />
        <div className="surface flex flex-col justify-center gap-4 px-4 py-3">
          <Duration label={text.cycleTime} stat={stats.cycleTime} />
          <Duration label={text.leadTime} stat={stats.leadTime} />
        </div>
        <OpenDistribution openBy={stats.openBy} />
      </div>
    </section>
  );
}

function SignalLink({
  href,
  tone,
  label,
  count,
}: {
  /** workspace 안의 화면 경로입니다. */
  href: string;
  tone: string;
  label: string;
  count: number;
}) {
  const workspaceHref = useWorkspaceHref();
  return (
    <Link href={workspaceHref(href)} className="chip bg-transparent font-medium hover:bg-base-200">
      <span className={`tone-dot ${tone}`} />
      {label}
      <span className="font-mono tabular-nums">{count}</span>
    </Link>
  );
}

/** 막대를 누르면 그날 만들거나 닫은 이슈를 이슈 목록에서 엽니다. 하루의 경계는 이슈 목록 날짜 필터와 같습니다. */
function ThroughputChart({ daily }: { daily: DailyFlow[] }) {
  const router = useRouter();
  const workspaceHref = useWorkspaceHref();
  const messages = useMessages();
  const text = messages.focus.stats;
  const today = daily.at(-1)?.day;
  const data = daily.map((flow) => ({
    ...flow,
    label: flow.day === today ? text.today : text.dayLabel(...monthAndDate(flow.day)),
  }));

  // 막대 모양과 함께 그 계열의 세로 칸 전체를 누를 수 있는 링크로 둡니다. 0인 날은 열 목록이 없어 링크를 두지 않습니다.
  const barOf = (series: FlowSeries) =>
    function FlowBar(props: BarShapeProps) {
      const flow = props.payload as DailyFlow;
      const count = flow[series];
      if (count === 0) return <g />;
      const href = workspaceHref(flowBarHref(series, flow.day));
      const area = props.background ?? props;
      return (
        <a
          href={href}
          aria-label={text.openDay(...monthAndDate(flow.day), series, count)}
          onClick={(event) => {
            event.preventDefault();
            router.push(href);
          }}
        >
          <rect
            x={area.x ?? undefined}
            y={area.y ?? undefined}
            width={area.width}
            height={area.height}
            fill="transparent"
          />
          <Rectangle {...props} radius={[4, 4, 0, 0]} />
        </a>
      );
    };

  return (
    <div className="surface col-span-2 flex min-h-44 flex-col gap-1 px-4 pt-3 pb-1">
      <h3 className="flex items-center gap-3 text-sm font-semibold">
        {text.throughput}
        <span className="ml-auto flex gap-3 text-xs font-normal text-base-content/60">
          {FLOW_SERIES.map((series) => (
            <span key={series} className="flex items-center gap-1.5">
              <span className={`flow-swatch flow-${series}`} />
              {text.series[series]}
            </span>
          ))}
        </span>
      </h3>
      {/*
        recharts의 svg는 height: 100%와 viewBox로 그려서, 높이가 내용으로 정해지는 칸에 두면 100%가 풀리지 않고
        viewBox 비율에 너비를 곱한 높이가 됩니다. 그러면 좁은 창에서 커진 카드 높이가 비율에 남아, 창을 넓히면 차트가
        너비에 비례해 커지고 카드 밖으로 넘칩니다. 차트를 absolute로 띄워 칸 높이를 정하는 데 끼지 않게 합니다.
      */}
      <div className="relative min-h-0 grow">
        <BarChart responsive style={{ position: "absolute", inset: 0 }} data={data} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--color-base-300)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
          />
          <YAxis
            allowDecimals={false}
            // 차트가 낮아 눈금이 다섯 개면 겹치는 눈금이 빠져 간격이 고르지 않게 보입니다.
            tickCount={3}
            width={28}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-base-200)" }}
            isAnimationActive={false}
            content={FlowTooltip}
          />
          {FLOW_SERIES.map((series) => (
            <Bar
              key={series}
              dataKey={series}
              name={text.series[series]}
              className={`flow-${series}`}
              maxBarSize={24}
              isAnimationActive={false}
              shape={barOf(series)}
            />
          ))}
        </BarChart>
      </div>
    </div>
  );
}

function FlowTooltip({ active, payload, label }: TooltipContentProps) {
  const messages = useMessages();
  if (!active || !payload?.length) return null;
  const flow = payload[0].payload as DailyFlow;
  return (
    <div className="surface flex flex-col gap-1 px-3 py-2 text-xs shadow-sm">
      <span className="font-semibold">{label}</span>
      {FLOW_SERIES.map((series) => (
        <span key={series} className="flex items-center gap-1.5">
          <span className={`flow-swatch flow-${series}`} />
          {messages.focus.stats.series[series]}
          <span className="ml-auto pl-3 font-mono tabular-nums">{flow[series]}</span>
        </span>
      ))}
    </div>
  );
}

function Duration({ label, stat }: { label: string; stat: DurationStat }) {
  const text = useMessages().focus.stats;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-base-content/60">{label}</span>
      {stat.median === null ? (
        <span className="text-xs text-base-content/45">{text.noDuration}</span>
      ) : (
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold tabular-nums">
            {formatDuration(text, stat.median)}
          </span>
          <span className="text-xs text-base-content/45">{text.durationBasis(stat.count)}</span>
        </span>
      )}
    </div>
  );
}

function formatDuration(text: Messages["focus"]["stats"], ms: number): string {
  const { unit, value } = durationParts(ms);
  return text.durations[unit](value);
}

type DistributionRow = { label: string; segments: { name: string; tone: string; count: number }[] };

/** 차원마다 막대 하나로 나눠 보이고, 값 이름과 개수는 막대 위에 글로 적어 색만으로 구분하지 않게 합니다. */
function OpenDistribution({ openBy }: { openBy: FocusStats["openBy"] }) {
  const messages = useMessages();
  const named = <T,>(
    counts: ValueCount<T>[],
    nameOf: (value: T) => string,
    toneOf: (value: T) => string,
  ) => counts.map(({ value, count }) => ({ name: nameOf(value), tone: toneOf(value), count }));
  const rows: DistributionRow[] = [
    {
      label: messages.issue.priority,
      segments: named(
        openBy.priority,
        (priority) =>
          priority === null ? messages.common.none : priorityLabel(messages, priority),
        priorityTone,
      ),
    },
    {
      label: messages.issue.type,
      segments: named(openBy.type, (type) => typeLabel(messages, type), typeTone),
    },
    {
      label: messages.issue.assignee,
      segments: named(
        openBy.assignee,
        (assignee) => assignee ?? messages.common.none,
        (assignee) => (assignee === null ? "tone-none" : nameTone(assignee)),
      ),
    },
  ];

  return (
    <div className="surface flex flex-col gap-2.5 px-4 py-3">
      <h3 className="text-sm font-semibold">{messages.focus.stats.openIssues}</h3>
      {rows.map(({ label, segments }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="flex gap-2 text-xs">
            <span className="shrink-0 text-base-content/60">{label}</span>
            <span className="truncate">
              {segments.length === 0
                ? messages.common.none
                : segments.map(({ name, count }) => `${name} ${count}`).join(" · ")}
            </span>
          </span>
          <span className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-base-200">
            {segments.map(({ name, tone, count }) => (
              <span key={name} className={`tone-bar ${tone}`} style={{ flexGrow: count }} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function monthAndDate(day: string): [number, number] {
  const date = localDate(day);
  return [date.getMonth() + 1, date.getDate()];
}
