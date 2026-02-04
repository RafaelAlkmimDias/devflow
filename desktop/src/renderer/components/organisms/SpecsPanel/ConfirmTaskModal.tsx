import { X, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface ConfirmTaskModalProps {
  task: Task;
  newStatus: Task['status'];
  isUpdating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmTaskModal({
  task,
  newStatus,
  isUpdating,
  onConfirm,
  onCancel,
}: ConfirmTaskModalProps) {
  const isMarkingComplete = newStatus === 'completed';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-[#12121a] border border-white/10 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm">
            {isMarkingComplete ? 'Confirmar Conclusão' : 'Reverter Conclusão'}
          </h3>
          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            {isMarkingComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm text-white font-medium mb-1">{task.title}</p>
              <p className="text-xs text-gray-400">
                {isMarkingComplete
                  ? 'Esta tarefa será marcada como concluída. Esta ação será salva no arquivo de spec.'
                  : 'Esta tarefa será marcada como pendente novamente. Esta ação será salva no arquivo de spec.'}
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-400">
              {isMarkingComplete
                ? 'A validação manual será persistida no arquivo markdown correspondente.'
                : 'O status será revertido no arquivo markdown correspondente.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5',
              isMarkingComplete
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            )}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {isMarkingComplete ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {isMarkingComplete ? 'Confirmar Conclusão' : 'Reverter Status'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
