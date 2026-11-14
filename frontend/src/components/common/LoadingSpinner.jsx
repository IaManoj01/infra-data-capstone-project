import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({
  message = "Loading operational telemetry...",
  size = "md",
}) {
  const sizeClasses =
    {
      sm: "w-4 h-4",
      md: "w-7 h-7",
      lg: "w-10 h-10",
    }[size] || "w-7 h-7";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 className={`${sizeClasses} animate-spin text-amber-500 mb-3`} />
      <p className="text-sm font-medium tracking-wide text-slate-600">
        {message}
      </p>
    </div>
  );
}
