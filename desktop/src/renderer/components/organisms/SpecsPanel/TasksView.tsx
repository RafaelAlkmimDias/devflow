import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useFileStore } from '@/lib/stores/fileStore';
import type { Task } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { TaskGroup } from './TaskGroup';
import { ConfirmTaskModal } from './ConfirmTaskModal';

interface TasksViewProps {
  tasks: Task[];
  onCreateNew: () => void;
}

export function TasksView({ tasks, onCreateNew }: TasksViewProps) {
  const { updateTaskStatusWithPersist } = useSpecsStore();
  const { openFile } = useFileStore();
  const [confirmModal, setConfirmModal] = useState<{ task: Task; newStatus: Task['status'] } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const groupedTasks = {
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    pending: tasks.filter(t => t.status === 'pending'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {groupedTasks.in_progress.length > 0 && (
          <TaskGroup
            title="In Progress"
            tasks={groupedTasks.in_progress}
            color="text-blue-400"
            onToggle={handleToggleRequest}
            onViewFile={handleViewFile}
          />
        )}
        {groupedTasks.pending.length > 0 && (
          <TaskGroup
            title="Pending"
            tasks={groupedTasks.pending}
            color="text-gray-400"
            onToggle={handleToggleRequest}
            onViewFile={handleViewFile}
          />
        )}
        {groupedTasks.blocked.length > 0 && (
          <TaskGroup
            title="Blocked"
            tasks={groupedTasks.blocked}
            color="text-red-400"
            onToggle={handleToggleRequest}
            onViewFile={handleViewFile}
          />
        )}
        {groupedTasks.completed.length > 0 && (
          <TaskGroup
            title="Completed"
            tasks={groupedTasks.completed}
            color="text-green-400"
            onToggle={handleToggleRequest}
            onViewFile={handleViewFile}
          />
        )}
      </div>

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
