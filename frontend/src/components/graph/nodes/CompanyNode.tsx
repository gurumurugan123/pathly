import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, Users } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';

export const CompanyNode: React.FC<{ data: any; id: string }> = ({ data, id }) => {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const showLabels = useUIStore((state) => state.showLabels);
  const isSelected = selectedNodeId === id;
  const isDimmed = data.isDimmed;

  return (
    <div className={`relative transition-all duration-300 ${isDimmed ? 'opacity-30 scale-95' : 'opacity-100'} ${isSelected ? 'scale-105' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2.5 !h-2.5" />

      <div className={`bg-white border-2 rounded-xl px-4 py-2.5 shadow-md flex items-center gap-3 transition-all min-w-[150px] ${isSelected ? 'border-blue-600 ring-4 ring-blue-100 shadow-lg' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'}`}>
        <div className="w-10 h-10 rounded-lg bg-navy-800 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
          {data.name ? data.name.substring(0, 2).toUpperCase() : <Building2 className="w-5 h-5" />}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{data.name}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
            <Users className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-700">{data.peopleCount || 0}</span>
            <span>{data.peopleCount === 1 ? 'connection' : 'connections'}</span>
          </div>
        </div>
      </div>

      {showLabels && data.industry && (
        <div className="mt-1 text-center">
          <span className="text-[10px] text-slate-400 bg-slate-100/90 px-2 py-0.5 rounded-full font-medium border border-slate-200">
            {data.industry}
          </span>
        </div>
      )}
    </div>
  );
};
