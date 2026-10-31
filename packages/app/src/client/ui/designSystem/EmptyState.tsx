type Props = {
  message: string;
  variant?: "screen" | "graph";
  className?: string;
};

const variants = {
  screen: "py-14 text-emphasis-50",
  graph: "px-6 py-10 text-emphasis-60",
};

export function EmptyState({ message, variant = "screen", className = "" }: Props) {
  return (
    <p
      className={`rounded-box border border-dashed border-base-300 text-center text-sm ${variants[variant]} ${className}`}
    >
      {message}
    </p>
  );
}
