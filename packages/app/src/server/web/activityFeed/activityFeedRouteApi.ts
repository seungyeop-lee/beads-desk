import { readDeletedIssueSnapshots } from "@/server/infra/eventsJournal/deletedIssueSnapshotCache";
import { readEventsJournal } from "@/server/infra/eventsJournal/eventsJournalCache";
import { readIssueExport } from "@/server/infra/issueExport/issueExportCache";
import { readActivityFeedPage } from "@/server/modules/activityFeed/application/activityFeed";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBadRequest, respondBdOutcome } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseActivityFeedQuery } from "@/shared/contract/activityFeed";

export async function handleActivityFeedRequest(request: Request): Promise<Response> {
  const query = parseActivityFeedQuery(new URL(request.url).searchParams);
  if (query === null) {
    return respondBadRequest((await serverMessages()).invalidActivityFeedQuery);
  }
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(
      await readActivityFeedPage(
        readIssueExport,
        readEventsJournal,
        readDeletedIssueSnapshots,
        cwd,
        query,
      ),
    ),
  );
}
