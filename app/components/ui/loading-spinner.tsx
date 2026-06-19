import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

function LoadingSpinner({ className, size = "md", text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-indigo-600 dark:text-indigo-400", sizeMap[size])} />
      {text && <p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p>}
    </div>
  );
}

export { LoadingSpinner };
