type Props = {
  size?: "xs" | "sm";
  tone?: "inherit" | "muted";
  label?: string;
  className?: string;
};

export function Spinner({ size = "xs", tone = "inherit", label, className = "" }: Props) {
  return (
    <span
      className={`loading loading-spinner ${size === "xs" ? "loading-xs" : "loading-sm"} ${tone === "muted" ? "text-emphasis-40" : ""} ${className}`}
      aria-label={label}
    />
  );
}
