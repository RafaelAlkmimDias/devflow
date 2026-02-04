import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

export function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('p-2 rounded-lg', color)}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
