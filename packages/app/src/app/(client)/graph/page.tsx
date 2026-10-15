import { Suspense } from "react";
import { GraphScreen } from "@/client/ui/screens/graph/GraphScreen";

export default function GraphPage() {
  return (
    <Suspense>
      <GraphScreen />
    </Suspense>
  );
}
