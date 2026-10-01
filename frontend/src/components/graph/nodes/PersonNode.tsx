import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getStatusConfig } from '../../../config/statuses';
import { useUIStore } from '../../../stores/uiStore';

export const PersonNode: React.FC<{ data: any; id: string }> = ({ data, id }) => {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const showLabels = useUIStore((state) => state.showLabels);
  const isSelected = selectedNodeId === id;
  const isDimmed = data.isDimmed;
  const isSearchMatch = data.isSearchMatch;

  const statusConfig = getStatusConfig(data.status || 'CONTACT_FOUND');
  const initials = data.name
    ? data.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'P';

  return (
    <div
      className={`relative group flex flex-col items-center transition-all duration-300 ${
        isDimmed ? 'opacity-20 scale-90' : 'opacity-100'
      } ${isSelected ? 'scale-110 z-20' : 'z-10'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-slate-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-300 !w-2 !h-2" />

      {/* Circle Avatar with Status Colored Border */}
      <div
        className={`w-14 h-14 rounded-full bg-white text-slate-800 font-bold text-sm flex items-center justify-center shadow-md border-3 transition-transform ${
          isSelected
            ? 'ring-4 ring-blue-400 ring-offset-2 scale-105'
            : 'group-hover:scale-105'
        } ${isSearchMatch ? 'ring-4 ring-amber-400' : ''}`}
        style={{ borderColor: statusConfig.color }}
      >
        <span className="text-slate-800 font-extrabold">{initials}</span>
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="mt-1 flex flex-col items-center text-center max-w-[130px]">
          <span className="text-xs font-bold text-slate-900 truncate w-full group-hover:text-blue-600 transition-colors">
            {data.name}
          </span>
          <span
            className="text-[10px] font-semibold truncate w-full mt-0.5"
            style={{ color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
        </div>
      )}
    </div>
  );
};
