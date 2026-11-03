import { Suspense } from "react";
import { IssuesScreen } from "@/client/ui/screens/issues/IssuesScreen";

export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesScreen />
    </Suspense>
  );
}
