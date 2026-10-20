import { Suspense } from "react";
import { BoardScreen } from "@/client/ui/screens/board/BoardScreen";

export default function BoardPage() {
  return (
    <Suspense>
      <BoardScreen />
    </Suspense>
  );
}
