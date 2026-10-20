import { Suspense } from "react";
import { HumanDecisionsScreen } from "@/client/ui/screens/humanDecisions/HumanDecisionsScreen";

export default function HumanDecisionsPage() {
  return (
    <Suspense>
      <HumanDecisionsScreen />
    </Suspense>
  );
}
