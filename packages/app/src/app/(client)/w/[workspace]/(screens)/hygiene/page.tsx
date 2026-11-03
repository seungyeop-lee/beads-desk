import { Suspense } from "react";
import { HygieneScreen } from "@/client/ui/screens/hygiene/HygieneScreen";

export default function HygienePage() {
  return (
    <Suspense>
      <HygieneScreen />
    </Suspense>
  );
}
