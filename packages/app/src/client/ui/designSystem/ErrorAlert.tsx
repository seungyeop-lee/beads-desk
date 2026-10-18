import type { ReactNode } from "react";

type ErrorAlertProps = {
  children: ReactNode;
  /** 알림이 놓일 자리의 여백 등을 더할 때 줍니다. */
  className?: string;
  /** 줄바꿈을 그대로 보여야 하는 오류 문구는 줍니다. */
  multiline?: boolean;
};

/** 조회나 실행이 실패했음을 알리는 알림입니다. 문구는 부르는 쪽에서 만들어 넘깁니다. */
export function ErrorAlert({ children, className = "", multiline }: ErrorAlertProps) {
  return (
    <div role="alert" className={`alert alert-error alert-soft ${className}`}>
      <span className={multiline ? "whitespace-pre-wrap" : undefined}>{children}</span>
    </div>
  );
}
