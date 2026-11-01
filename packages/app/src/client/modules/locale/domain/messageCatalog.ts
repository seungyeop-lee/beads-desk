import type { IssueStatus } from "@beads-desk/bd/issue";
import type { ClosedWindow } from "@/client/modules/board/domain/boardView";
import type { EpicGroupKind } from "@/client/modules/epics/domain/epicGroups";
import type { BottleneckOrderKey } from "@/client/modules/focus/domain/focusBottlenecks";
import type { EdgeKind } from "@/client/modules/graph/domain/edgeKind";
import type { GraphScope } from "@/client/modules/graph/domain/graphScope";
import type { IssueDateField } from "@/client/modules/issues/domain/issueDateFilter";
import type { RelationKind } from "@/client/modules/issues/domain/issueRelations";
import type { WorkState } from "@/client/modules/issues/domain/workState";
import type { DiffFileBadge } from "@/client/modules/markdown/domain/diffPreview";
import type { ActivityKind } from "@/shared/contract/activityFeed";
import type { Replacement } from "@/shared/contract/issueActions";
import type { ThemeChoice } from "@/shared/contract/theme";
import type { BoardColumn } from "@/shared/domain/board/boardColumns";
import type { BodyField } from "@/shared/domain/issues/bodyFields";

type GraphScopeKind = GraphScope["kind"];

type DependencyTypeLabels = {
  blocks: string;
  "parent-child": string;
  related: string;
  "discovered-from": string;
  supersedes: string;
  duplicates: string;
};

/** 화면 문구 사전의 모양입니다. 언어마다 사전 하나가 이 type을 따르므로, 한 사전에서 문구를 빠뜨리면 typecheck가 실패합니다. */
export type Messages = {
  common: {
    untitled: string;
    titlePlaceholder: string;
    none: string;
    save: string;
    cancel: string;
    close: string;
    loading: string;
    serverUnreachable: string;
    unreadableResponse: string;
    requestFailed: string;
  };
  shell: {
    screens: string;
    newIssue: string;
    /** 스크린 리더가 상단 탭 이름 뒤에 이어 읽는 개수입니다. 화면에는 숫자만 보입니다. */
    awaitingCount: (count: number) => string;
    workspace: string;
  };
  settings: {
    title: string;
    theme: string;
    themes: Record<ThemeChoice, string>;
    language: string;
    notifications: string;
    humanDecisionNotices: string;
    humanDecisionNoticesHint: string;
    humanDecisionNoticeSound: string;
    humanDecisionNoticeSoundHint: string;
    notificationsDenied: string;
    notificationsUnsupported: string;
  };
  issue: {
    statuses: Record<IssueStatus, string>;
    ready: string;
    types: {
      bug: string;
      feature: string;
      task: string;
      epic: string;
      chore: string;
      decision: string;
      spike: string;
      story: string;
      milestone: string;
      gate: string;
    };
    /** 우선순위 0부터 차례대로 둔 이름입니다. */
    priorities: readonly string[];
    /** 의존 관계 유형을 보는 쪽에 맞춰 부릅니다. */
    dependencyTypes: {
      dependencies: DependencyTypeLabels;
      dependents: DependencyTypeLabels;
    };
    bodyFields: Record<BodyField, string>;
    type: string;
    title: string;
    status: string;
    priority: string;
    assignee: string;
    dueAt: string;
    labels: string;
    dependencyCount: string;
    waiters: (count: number) => string;
    waitersHint: (count: number) => string;
  };
  issueTable: {
    empty: string;
    statusOf: (id: string) => string;
    priorityOf: (id: string) => string;
    dependencyCounts: (dependencies: number, dependents: number) => string;
    toggleChildren: (id: string, expanded: boolean) => string;
    childCount: (count: number) => string;
    unblocks: string;
  };
  blocking: {
    chip: string;
    waitingOn: (id: string) => string;
    more: (count: number) => string;
    bannerTitle: string;
    bannerBody: string;
  };
  humanDecision: {
    chip: string;
    panelTitle: string;
    panelBody: string;
    response: string;
    placeholder: string;
    respond: string;
    dismiss: string;
    dismissReason: string;
    dismissReasonPlaceholder: string;
    confirmDismiss: string;
    responded: (id: string) => string;
    dismissed: (id: string) => string;
  };
  humanGate: {
    waiting: string;
    waitingOn: (title: string) => string;
    panelTitle: string;
    panelBody: string;
    reason: string;
    blocks: string;
    noBlocks: string;
    manyBlocks: (count: number) => string;
    previousRounds: (count: number) => string;
    previousFeedback: string;
    previousLoading: string;
    previousLoadFailed: (error: string) => string;
    roundClosed: (time: string) => string;
    responseTitle: string;
    responseBody: string;
    responsePlaceholder: string;
  };
  copyId: {
    label: string;
    labelOf: (id: string) => string;
    copied: (id: string) => string;
    failed: (id: string) => string;
  };
  claim: {
    label: string;
    hint: string;
  };
  editable: {
    editField: (label: string) => string;
    addField: (label: string) => string;
    edit: string;
  };
  markdownEditor: {
    preview: string;
    previewLoading: string;
    showCode: string;
    hideCode: string;
    enlargeDiagram: string;
    enlargedDiagram: string;
    filePreview: (name: string) => string;
    filePreviewContents: (name: string) => string;
    filePreviewLoading: string;
    filePreviewTooLarge: (megabytes: number) => string;
    openFile: string;
    openInNewTab: (name: string) => string;
    diffBadges: Record<DiffFileBadge, string>;
    diffLineCounts: (added: number, deleted: number) => string;

    toolbar: (label: string) => string;
    blockType: string;
    paragraph: string;
    heading: (level: number) => string;
    bold: string;
    italic: string;
    strikethrough: string;
    inlineCode: string;
    link: string;
    bulletList: string;
    orderedList: string;
    quote: string;
    codeBlock: string;
    table: string;
    divider: string;
  };
  newIssue: {
    title: string;
    titlePlaceholder: string;
    defaultType: string;
    labelsPlaceholder: string;
    parent: string;
    parentSearch: string;
    clearParent: string;
    descriptionPlaceholder: string;
    submitHint: string;
    create: string;
  };
  issueDetail: {
    loading: string;
    dialog: (id: string) => string;
    backTo: (id: string) => string;
    working: string;
    loadFailed: (error: string) => string;
    closeReason: string;
    linkedIssues: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string;
    delete: string;
    confirmDelete: (id: string) => string;
    confirmRemoveDependency: (id: string) => string;
    confirmForceClose: (reason: string) => string;
    sidePanel: (id: string) => string;
    openInMain: string;
    closeSidePanel: string;
  };
  closeIssue: {
    title: string;
    reason: string;
    reasonPlaceholder: string;
    submit: string;
    unblocked: (count: number) => string;
    andMore: (count: number) => string;
  };
  deferral: {
    title: string;
    until: string;
    periods: { tomorrow: string; week: string; indefinite: string; date: string };
    date: string;
    dateHint: string;
    reason: string;
    reasonPlaceholder: string;
    submit: string;
    reopen: string;
    reopenHint: string;
  };
  dueAt: {
    date: string;
    time: string;
    timeHint: string;
    clear: string;
  };
  dependencyList: {
    remove: (id: string) => string;
  };
  relations: {
    title: string;
    kind: string;
    kinds: Record<RelationKind, string>;
    /** 관계 이름만으로는 방향이 헷갈리는 선택지에만 붙이는 설명입니다. */
    kindHints: Partial<Record<RelationKind, string>>;
    search: string;
    linkConfirm: string;
    linked: (id: string, kind: string) => string;
  };
  closeAsReplaced: {
    title: string;
    method: string;
    methods: Record<Replacement, string>;
    search: string;
    confirm: Record<Replacement, (id: string, target: string) => string>;
    closed: Record<Replacement, (id: string, target: string) => string>;
  };
  issuePicker: {
    placeholder: string;
    empty: string;
    clearSelection: string;
  };
  labelEditor: {
    remove: (label: string) => string;
    labelToAdd: string;
    placeholder: string;
    add: string;
  };
  comments: {
    title: string;
    newComment: string;
    placeholder: string;
    submit: string;
    submitHint: string;
  };
  activity: {
    title: string;
    tabs: string;
    loading: string;
    loadFailed: (error: string) => string;
    created: string;
    closed: string;
    closedWithReason: (reason: string) => string;
    reopened: string;
    fieldChanged: (field: string, before: string, after: string) => string;
    bodyChanged: (field: string) => string;
    dependencyAdded: (relation: string, issueId: string) => string;
    dependencyRemoved: (issueId: string) => string;
    labelAdded: (label: string) => string;
    labelRemoved: (label: string) => string;
  };
  focus: {
    title: string;
    inProgress: string;
    summary: string;
    list: {
      seeAll: (count: number) => string;
      showFewer: string;
    };
    epicProgress: string;
    epicProgressOf: (title: string) => string;
    inProgressEmpty: string;
    readyEmpty: string;
    blockedEmpty: string;
    epicsEmpty: string;
    deadlines: {
      title: string;
      overdue: string;
      overdueBasis: string;
      dueToday: string;
      dueSoon: (days: number) => string;
      none: (days: number) => string;
      noneBasis: (today: string, days: number, soon: string) => string;
    };
    bottlenecks: {
      title: string;
      /** 병목 목록의 정렬 기준을 앞선 기준부터 차례대로 설명하는 문장입니다. */
      order: (keys: readonly BottleneckOrderKey[]) => string;
      empty: string;
      unblocks: (count: number) => string;
      unblocksHint: string;
      state: (label: string) => string;
      openGraphOf: (id: string) => string;
    };
    stats: {
      title: string;
      throughput: string;
      series: { created: string; closed: string };
      dayLabel: (month: number, date: number) => string;
      today: string;
      openDay: (month: number, date: number, series: "created" | "closed", count: number) => string;
      cycleTime: string;
      leadTime: string;
      durationBasis: (count: number) => string;
      noDuration: string;
      durations: {
        minutes: (value: number) => string;
        hours: (value: number) => string;
        days: (value: number) => string;
      };
      openIssues: string;
      closableEpics: string;
    };
  };
  issues: {
    title: string;
    loadFailed: (error: string) => string;
    textSearchFailed: (error: string) => string;
    allStatuses: string;
    allTypes: string;
    typeCount: (count: number) => string;
    allLabels: string;
    labelCount: (count: number) => string;
    noLabel: string;
    searchPlaceholder: string;
    /** 검색어가 댓글에서 맞았을 때 발췌 앞에 붙이는 이름입니다. 본문 필드는 issue.bodyFields의 이름을 씁니다. */
    commentHit: string;
    search: string;
    views: string;
    dates: string;
    dateField: string;
    dateFields: Record<IssueDateField, string>;
    dateFrom: string;
    dateTo: string;
    clearDates: string;
    toggleGroup: (label: string, expanded: boolean) => string;
  };
  /** 저장 상태, 의존 관계, bd ready를 합친 작업 상태(workState)의 이름과 설명입니다. */
  workStates: {
    labels: Record<WorkState, string>;
    hints: Record<WorkState, string>;
  };
  epics: {
    title: string;
    loadFailed: (error: string) => string;
    empty: string;
    search: string;
    searchPlaceholder: string;
    noMatches: string;
    toggleChildren: (id: string, expanded: boolean) => string;
    progress: (id: string) => string;
    childrenLoading: string;
    childrenLoadFailed: (error: string) => string;
    childrenEmpty: string;
    newChild: string;
    addExistingChild: string;
    addExistingChildPlaceholder: string;
    addChildConfirm: string;
    childAdded: (id: string, epicId: string) => string;
    groups: Record<EpicGroupKind, string>;
    toggleGroup: (label: string, expanded: boolean) => string;
    closedOn: (date: string) => string;
    closedChildCount: string;
  };
  graph: {
    scopes: Record<GraphScopeKind, string>;
    help: Record<GraphScopeKind, string>;
    loadFailed: (error: string) => string;
    canvas: string;
    edgeLabel: (from: string, to: string) => string;
    legend: string;
    edgeLegend: Record<EdgeKind, string>;
    edgeLegendHelp: Record<EdgeKind, string>;
    conditionEdge: (from: string, to: string) => string;
    relatedEdge: (from: string, to: string) => string;
    discoveredEdge: (from: string, to: string) => string;
    controls: string;
    zoomIn: string;
    zoomOut: string;
    fitView: string;
    focusIssue: string;
    focusStage: string;
    focusLastStage: string;
    minimap: string;
    stage: (stage: number) => string;
    stageDone: string;
    stageCurrent: string;
    progress: (current: number, total: number) => string;
    allStagesDone: (total: number) => string;
    outside: string;
    outsideHint: string;
    unordered: string;
    collapse: string;
    expand: string;
    collapseUnordered: string;
    expandUnordered: string;
    unorderedHint: string;
    cycle: string;
    cyclePath: string;
    empty: Record<GraphScopeKind, string>;
    epicOrder: string;
    blockingChain: string;
  };
  board: {
    title: string;
    description: string;
    loadFailed: (error: string) => string;
    columns: Record<BoardColumn, string>;
    closedWindow: string;
    closedWindows: Record<ClosedWindow, string>;
    stillBlocked: (id: string) => string;
  };
  humanDecisions: {
    title: string;
    description: string;
    empty: string;
    gates: string;
    questions: string;
    openDetail: string;
    noDescription: string;
    /** 운영체제 알림의 제목입니다. 어느 workspace의 알림인지 먼저 보이게 합니다. */
    noticeTitle: (workspace: string) => string;
    noticeBody: (title: string, moreCount: number) => string;
  };
  activityFeed: {
    title: string;
    description: string;
    loadFailed: (error: string) => string;
    entries: string;
    empty: string;
    emptyInRange: string;
    kinds: Record<ActivityKind, string>;
    /** events journal이 꺼진 workspace에서 피드 위에 보이는 안내입니다. command는 모든 언어에서 같습니다. */
    journalOff: {
      message: string;
      command: string;
    };
    dates: string;
    dateFrom: string;
    dateTo: string;
    clearDates: string;
    /** 마지막으로 본 시각의 구분선입니다. 이 선 아래의 기록은 지난번에 화면을 열었을 때 이미 있던 기록입니다. */
    seenBefore: string;
    showMore: string;
  };
  workspaces: {
    selectTitle: string;
    selectDescription: string;
    notFoundTitle: string;
    notFound: (name: string) => string;
    showAll: string;
  };
  decisions: {
    title: string;
    loadFailed: (error: string) => string;
    current: string;
    currentEmpty: string;
    retired: string;
    retiredEmpty: string;
    supersession: string;
    createdOn: string;
    supersededBy: string;
    supersedes: string;
  };
  hygiene: {
    title: string;
    description: string;
    loadFailed: (error: string) => string;
    stale: {
      title: string;
      hint: (days: number) => string;
      empty: (days: number) => string;
      days: string;
      dayOption: (days: number) => string;
    };
    orphans: {
      title: string;
      hint: string;
      empty: string;
    };
    lint: {
      title: string;
      hint: string;
      empty: string;
      missing: (sections: string) => string;
    };
    duplicates: {
      title: string;
      hint: string;
      empty: string;
      closeAs: (id: string, target: string) => string;
    };
    closableEpics: {
      title: string;
      hint: string;
      empty: string;
    };
  };
};
