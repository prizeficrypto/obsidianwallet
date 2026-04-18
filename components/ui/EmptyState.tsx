"use client";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "#161616", color: "rgba(255,255,255,0.3)" }}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{title}</p>
        {description && (
          <p className="text-[12px] mt-1 max-w-[220px]" style={{ color: "rgba(255,255,255,0.22)", fontWeight: 400 }}>{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 text-xs px-5 py-2 rounded-full font-medium transition-opacity active:opacity-70"
          style={{ background: "#1e1e1e", color: "#9B8FFF" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
