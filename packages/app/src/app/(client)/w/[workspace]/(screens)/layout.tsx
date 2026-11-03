import { Suspense } from "react";
import { GraphScreen } from "@/client/ui/screens/graph/GraphScreen";
import { AppHeader } from "@/client/ui/shell/AppHeader";

/** 앱 화면 사이를 오가는 머리글과, 어느 화면 위에나 열리는 그래프를 둡니다. */
export default function AppScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <Suspense>
        <GraphScreen />
      </Suspense>
    </>
  );
}
