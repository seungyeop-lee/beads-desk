import { Suspense } from "react";
import { LocalDiffScreen } from "@/client/ui/screens/localDiff/LocalDiffScreen";

export default function LocalDiffPage() {
  return (
    <Suspense>
      <LocalDiffScreen />
    </Suspense>
  );
}
