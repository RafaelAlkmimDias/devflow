import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityItem } from './types';

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <activity.icon className={cn('w-4 h-4 mt-0.5', activity.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{activity.text}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  );
}
