import { Suspense } from "react";
import { DecisionsScreen } from "@/client/ui/screens/decisions/DecisionsScreen";

export default function DecisionsPage() {
  return (
    <Suspense>
      <DecisionsScreen />
    </Suspense>
  );
}
