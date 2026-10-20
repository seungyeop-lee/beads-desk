import { Suspense } from "react";
import { ActivityFeedScreen } from "@/client/ui/screens/activityFeed/ActivityFeedScreen";

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityFeedScreen />
    </Suspense>
  );
}
