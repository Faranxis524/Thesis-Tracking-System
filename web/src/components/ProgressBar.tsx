type ProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 shadow-sm"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
