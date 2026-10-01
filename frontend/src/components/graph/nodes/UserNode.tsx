import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { User as UserIcon } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';

export const UserNode: React.FC<{ data: any; id: string }> = ({ data, id }) => {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const isSelected = selectedNodeId === id;

  return (
    <div className={`relative group flex flex-col items-center justify-center p-1 rounded-full transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-600 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-600 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-blue-600 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-blue-600 !w-2 !h-2" />

      {/* Main Circular YOU Node */}
      <div className={`w-20 h-20 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-xl flex flex-col items-center justify-center border-4 border-white transition-all ${isSelected ? 'ring-4 ring-blue-400 ring-offset-2 node-pulse' : 'hover:scale-105'}`}>
        <UserIcon className="w-8 h-8 text-white drop-shadow" />
        <span className="text-xs font-bold tracking-wider mt-0.5 uppercase drop-shadow-sm">YOU</span>
      </div>

      <div className="mt-2 bg-slate-900/90 text-white text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-700 shadow-md">
        {data.name || 'Root User'}
      </div>
    </div>
  );
};
