import { Suspense } from "react";
import { FocusScreen } from "@/client/ui/screens/focus/FocusScreen";

export default function FocusPage() {
  return (
    <Suspense>
      <FocusScreen />
    </Suspense>
  );
}
