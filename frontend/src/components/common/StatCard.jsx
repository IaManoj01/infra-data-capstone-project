import React from "react";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = "amber",
  onClick,
}) {
  const schemeStyles = {
    amber: {
      border: "border-l-4 border-l-amber-500",
      iconBg: "bg-amber-50 text-amber-600",
    },
    rose: {
      border: "border-l-4 border-l-rose-500",
      iconBg: "bg-rose-50 text-rose-600",
    },
    blue: {
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-blue-50 text-blue-600",
    },
    emerald: {
      border: "border-l-4 border-l-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    purple: {
      border: "border-l-4 border-l-purple-500",
      iconBg: "bg-purple-50 text-purple-600",
    },
    slate: {
      border: "border-l-4 border-l-slate-400",
      iconBg: "bg-slate-100 text-slate-600",
    },
  }[colorScheme] || {
    border: "border-l-4 border-l-slate-400",
    iconBg: "bg-slate-100 text-slate-600",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 transition-all duration-200 hover:shadow-md ${schemeStyles.border} ${
        onClick ? "cursor-pointer hover:border-slate-300" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}
              >
                {trend.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${schemeStyles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
