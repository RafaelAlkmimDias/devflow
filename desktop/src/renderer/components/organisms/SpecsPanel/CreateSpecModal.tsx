import { useState } from 'react';
import { X, FileText, Cpu, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecPhase } from '@/lib/types';

interface CreateSpecModalProps {
  projectPath: string;
  activePhase: SpecPhase;
  onClose: () => void;
}

export function CreateSpecModal({
  projectPath,
  activePhase,
  onClose,
}: CreateSpecModalProps) {
  const [type, setType] = useState<'story' | 'adr' | 'spec'>(
    activePhase === 'design' ? 'adr' : 'story'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('should');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsCreating(true);

    // TODO: Implement spec creation via IPC
    console.log('Creating spec:', { type, title, description, priority, activePhase, projectPath });

    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="font-semibold text-white text-sm sm:text-base">Create New Spec</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Type</label>
            <div className="flex gap-1.5 sm:gap-2">
              {[
                { id: 'story', label: 'Story', fullLabel: 'User Story', icon: <FileText className="w-4 h-4" /> },
                { id: 'adr', label: 'ADR', fullLabel: 'ADR', icon: <Cpu className="w-4 h-4" /> },
                { id: 'spec', label: 'Spec', fullLabel: 'Spec', icon: <ListTodo className="w-4 h-4" /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as 'story' | 'adr' | 'spec')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm transition-all',
                    type === t.id
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  )}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.fullLabel}</span>
                  <span className="sm:hidden">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'story' ? 'User authentication flow' : type === 'adr' ? 'Use PostgreSQL for database' : 'Feature specification'}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Priority (for stories) */}
          {type === 'story' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Priority</label>
              <div className="flex gap-1.5 sm:gap-2">
                {[
                  { id: 'must', label: 'Must', color: 'text-red-400' },
                  { id: 'should', label: 'Should', color: 'text-amber-400' },
                  { id: 'could', label: 'Could', color: 'text-blue-400' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={cn(
                      'flex-1 px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm transition-all',
                      priority === p.id
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className={p.color}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
