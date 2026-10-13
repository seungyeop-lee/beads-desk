import { Suspense } from "react";
import { EpicsScreen } from "@/client/ui/screens/epics/EpicsScreen";

export default function EpicsPage() {
  return (
    <Suspense>
      <EpicsScreen />
    </Suspense>
  );
}
