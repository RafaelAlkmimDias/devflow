import { useMemo, useState } from 'react';
import { ListTodo } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useFileStore } from '@/lib/stores/fileStore';
import type { Task } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { TaskGroup } from './TaskGroup';
import { ConfirmTaskModal } from './ConfirmTaskModal';
import { StatusFilterTabs, type StatusFilter } from './StatusFilterTabs';

interface TasksViewProps {
  tasks: Task[];
  onCreateNew: () => void;
}

export function TasksView({ tasks, onCreateNew }: TasksViewProps) {
  const { updateTaskStatusWithPersist } = useSpecsStore();
  const { openFile } = useFileStore();
  const [confirmModal, setConfirmModal] = useState<{ task: Task; newStatus: Task['status'] } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  const handleToggleRequest = (task: Task, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setConfirmModal({ task, newStatus });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal) return;

    setIsUpdating(true);
    try {
      await updateTaskStatusWithPersist(confirmModal.task.id, confirmModal.newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
      setConfirmModal(null);
    }
  };

  const handleViewFile = (filePath: string) => {
    openFile(filePath);
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo className="w-8 h-8" />}
        title="No Tasks Yet"
        description="Tasks are extracted from your specs. Create a spec with checkbox items to see tasks here."
        action="Create Spec"
        onAction={onCreateNew}
      />
    );
  }

  const filteredTasks = statusFilter === 'pending' ? pendingTasks : completedTasks;

  const groupedPending = {
    in_progress: pendingTasks.filter(t => t.status === 'in_progress'),
    pending: pendingTasks.filter(t => t.status === 'pending'),
    blocked: pendingTasks.filter(t => t.status === 'blocked'),
  };

  return (
    <>
      <StatusFilterTabs
        active={statusFilter}
        onChange={setStatusFilter}
        pendingCount={pendingTasks.length}
        completedCount={completedTasks.length}
      />

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          {statusFilter === 'pending' ? 'Nenhuma task pendente' : 'Nenhuma task concluída'}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {statusFilter === 'pending' ? (
            <>
              {groupedPending.in_progress.length > 0 && (
                <TaskGroup
                  title="In Progress"
                  tasks={groupedPending.in_progress}
                  color="text-blue-400"
                  onToggle={handleToggleRequest}
                  onViewFile={handleViewFile}
                />
              )}
              {groupedPending.pending.length > 0 && (
                <TaskGroup
                  title="Pending"
                  tasks={groupedPending.pending}
                  color="text-gray-400"
                  onToggle={handleToggleRequest}
                  onViewFile={handleViewFile}
                />
              )}
              {groupedPending.blocked.length > 0 && (
                <TaskGroup
                  title="Blocked"
                  tasks={groupedPending.blocked}
                  color="text-red-400"
                  onToggle={handleToggleRequest}
                  onViewFile={handleViewFile}
                />
              )}
            </>
          ) : (
            <TaskGroup
              title="Completed"
              tasks={completedTasks}
              color="text-green-400"
              onToggle={handleToggleRequest}
              onViewFile={handleViewFile}
            />
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmTaskModal
          task={confirmModal.task}
          newStatus={confirmModal.newStatus}
          isUpdating={isUpdating}
          onConfirm={handleConfirmToggle}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}
