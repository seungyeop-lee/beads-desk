/** 목록이 비었을 때 목록 자리에 보이는 안내입니다. */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-box border border-dashed border-base-300 py-14 text-center text-sm text-emphasis-50">
      {message}
    </p>
  );
}
