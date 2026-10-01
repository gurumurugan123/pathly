import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { STATUS_CONFIG, getStatusConfig } from '../../config/statuses';

interface StatusPipelineProps {
  currentStatus: string;
  onStatusChange: (newStatus: string, note?: string) => Promise<void>;
  isUpdating?: boolean;
}

export const StatusPipeline: React.FC<StatusPipelineProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const pipelineStatuses = [
    'CONTACT_FOUND',
    'CONTACTED',
    'RESUME_SENT',
    'RESUME_ACCEPTED',
    'REPLIED',
    'WILL_REFER',
    'REFERRAL_GIVEN',
  ];

  const currentConfig = getStatusConfig(currentStatus);
  const currentIndex = pipelineStatuses.indexOf(currentStatus);

  const handleStepClick = (statusKey: string) => {
    if (statusKey === currentStatus) return;
    setSelectedStatus(statusKey);
    setShowNoteModal(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedStatus) return;
    await onStatusChange(selectedStatus, noteInput);
    setShowNoteModal(false);
    setNoteInput('');
    setSelectedStatus(null);
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-4 my-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Referral Pipeline Stage</h4>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentConfig.bgClass} ${currentConfig.textClass} ${currentConfig.borderClass}`}>
          {currentConfig.label}
        </span>
      </div>

      <div className="space-y-2">
        {pipelineStatuses.map((key, index) => {
          const cfg = getStatusConfig(key);
          const isPassed = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = key === currentStatus;

          return (
            <button
              key={key}
              onClick={() => handleStepClick(key)}
              disabled={isUpdating}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                isCurrent
                  ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100 text-blue-900 font-bold'
                  : isPassed
                  ? 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200/60'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isPassed
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPassed && !isCurrent ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                <span>{cfg.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {isCurrent && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">Other Outcome:</span>
        <select
          value={currentStatus}
          onChange={(e) => handleStepClick(e.target.value)}
          className="text-xs font-medium border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_CONFIG.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.category})
            </option>
          ))}
        </select>
      </div>

      {showNoteModal && selectedStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Status to "{getStatusConfig(selectedStatus).label}"
            </h3>
            <p className="text-xs text-slate-600">
              This change will create an immutable history log event in your timeline.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Log Note (Optional)
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Sent message on LinkedIn, confirmed referral code..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                disabled={isUpdating}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {isUpdating ? 'Updating...' : 'Confirm Status Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
