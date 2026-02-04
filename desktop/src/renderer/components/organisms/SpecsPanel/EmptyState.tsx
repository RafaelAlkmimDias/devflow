interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-gray-500 mb-3 sm:mb-4">
        {icon}
      </div>
      <h3 className="font-medium mb-1 sm:mb-2 text-white text-sm sm:text-base">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 max-w-[200px] sm:max-w-[220px]">{description}</p>
      <button
        onClick={onAction}
        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
      >
        {action}
      </button>
    </div>
  );
}
