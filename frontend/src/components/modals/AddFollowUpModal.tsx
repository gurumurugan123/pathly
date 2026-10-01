import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createFollowUp } from '../../services/followups';
import { fetchApplications } from '../../services/applications';

interface AddFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultApplicationId?: number;
}

export const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({ isOpen, onClose, defaultApplicationId }) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [appId, setAppId] = useState<number | ''>(defaultApplicationId || '');

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: createFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      if (appId) {
        queryClient.invalidateQueries({ queryKey: ['application', appId] });
      }
      handleClose();
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setAppId(defaultApplicationId || '');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      due_date: new Date(dueDate).toISOString(),
      application: appId ? Number(appId) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Schedule Follow-up</h3>
              <p className="text-[11px] text-slate-500">Set a reminder for a referral or application action</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up on Zoho referral status"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Due Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link to Application (Optional)
            </label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- Standalone Follow-up --</option>
              {(applications || []).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.job_title} @ {app.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, interview preparation notes, links..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[60px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim() || !dueDate}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Scheduling...' : 'Schedule Follow-up'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
