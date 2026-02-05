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
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4 transition-all duration-200 hover:bg-[#1f1f2a] hover:border-white/15 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('p-2 rounded-lg transition-transform duration-200 group-hover:scale-110', color)}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-white transition-transform duration-200 group-hover:scale-105">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">{subtitle}</p>
    </div>
  );
}
