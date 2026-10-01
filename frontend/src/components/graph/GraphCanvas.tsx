import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';

import { UserNode } from './nodes/UserNode';
import { CompanyNode } from './nodes/CompanyNode';
import { PersonNode } from './nodes/PersonNode';
import { GraphToolbar } from './GraphToolbar';
import { GraphLegend } from './GraphLegend';
import { computeRadialLayout } from '../../utils/layout';
import { useUIStore } from '../../stores/uiStore';

const nodeTypes = {
  userNode: UserNode,
  companyNode: CompanyNode,
  personNode: PersonNode,
};

interface GraphCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ initialNodes, initialEdges }) => {
  const searchQuery = useUIStore((state) => state.searchQuery);
  const statusFilter = useUIStore((state) => state.statusFilter);
  const setSelectedNode = useUIStore((state) => state.setSelectedNode);
  const clearSelectedNode = useUIStore((state) => state.clearSelectedNode);

  const focusedApplicationId = useUIStore((state) => state.focusedApplicationId);
  const focusedCompanyId = useUIStore((state) => state.focusedCompanyId);
  const focusedContactIds = useUIStore((state) => state.focusedContactIds);
  const highlightedNodeIds = useUIStore((state) => state.highlightedNodeIds);
  const clearGraphFocus = useUIStore((state) => state.clearGraphFocus);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    return computeRadialLayout(
      initialNodes,
      initialEdges,
      searchQuery,
      statusFilter,
      focusedCompanyId,
      focusedContactIds
    );
  }, [initialNodes, initialEdges, searchQuery, statusFilter, focusedCompanyId, focusedContactIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  React.useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Compute final node styles with AI & Focus Highlighting
  const styledNodes = useMemo(() => {
    const isFilterActive = (highlightedNodeIds && highlightedNodeIds.length > 0) || focusedApplicationId !== null;
    if (!isFilterActive) return nodes;

    const highlightSet = new Set<string>();
    const highlightEntityIds = new Set<number>();

    (highlightedNodeIds || []).forEach((idStr) => {
      if (!idStr) return;
      highlightSet.add(idStr);
      highlightSet.add(idStr.replace('_', '-'));
      highlightSet.add(idStr.replace('-', '_'));

      const numMatch = idStr.match(/\d+/);
      if (numMatch) {
        highlightEntityIds.add(Number(numMatch[0]));
      }
    });

    return nodes.map((node) => {
      let isHighlighted = false;

      if (node.id === 'user-root' || node.id === 'user_hub' || node.type === 'userNode') {
        isHighlighted = true;
      } else {
        const hyphenId = node.id;
        const underscoreId = node.id.replace('-', '_');
        const entityId = node.data?.id as number;

        if (
          highlightSet.has(hyphenId) ||
          highlightSet.has(underscoreId) ||
          (entityId && highlightEntityIds.has(entityId))
        ) {
          isHighlighted = true;
        } else if (focusedApplicationId !== null) {
          if (node.type === 'companyNode' && entityId === focusedCompanyId) {
            isHighlighted = true;
          } else if (node.type === 'personNode' && focusedContactIds.includes(entityId)) {
            isHighlighted = true;
          }
        }
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isHighlighted ? 1 : 0.25,
          filter: isHighlighted ? 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.8)) font-weight-bold' : 'grayscale(80%) opacity(30%)',
          transition: 'all 0.3s ease',
        },
      };
    });
  }, [nodes, highlightedNodeIds, focusedApplicationId, focusedCompanyId, focusedContactIds]);

  // Compute edge highlighting
  const styledEdges = useMemo(() => {
    const isFilterActive = (highlightedNodeIds && highlightedNodeIds.length > 0) || focusedApplicationId !== null;
    if (!isFilterActive) return edges;

    const highlightSet = new Set<string>();
    (highlightedNodeIds || []).forEach((idStr) => {
      if (!idStr) return;
      highlightSet.add(idStr);
      highlightSet.add(idStr.replace('_', '-'));
      highlightSet.add(idStr.replace('-', '_'));
    });

    return edges.map((edge) => {
      const isSourceActive =
        edge.source === 'user-root' ||
        edge.source === 'user_hub' ||
        highlightSet.has(edge.source) ||
        highlightSet.has(edge.source.replace('-', '_')) ||
        highlightSet.has(edge.source.replace('_', '-')) ||
        (focusedCompanyId !== null && (edge.source === `company-${focusedCompanyId}` || edge.source === `company_${focusedCompanyId}`));

      const isTargetActive =
        highlightSet.has(edge.target) ||
        highlightSet.has(edge.target.replace('-', '_')) ||
        highlightSet.has(edge.target.replace('_', '-')) ||
        (focusedContactIds.length > 0 && focusedContactIds.some((cid: number) => edge.target === `person-${cid}` || edge.target === `person_${cid}`));

      const isHighlighted = Boolean(isSourceActive && isTargetActive);

      return {
        ...edge,
        animated: isHighlighted,
        style: {
          ...edge.style,
          opacity: isHighlighted ? 1 : 0.15,
          strokeWidth: isHighlighted ? 3 : 1.5,
          transition: 'all 0.3s ease',
        },
      };
    });
  }, [edges, highlightedNodeIds, focusedApplicationId, focusedCompanyId, focusedContactIds]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const entityId = node.data?.id as number;
      if (node.type === 'personNode') {
        setSelectedNode(node.id, 'person', entityId);
      } else if (node.type === 'companyNode') {
        setSelectedNode(node.id, 'company', entityId);
      } else if (node.type === 'userNode') {
        setSelectedNode(node.id, 'user', entityId);
      }
    },
    [setSelectedNode]
  );

  const handlePaneClick = useCallback(() => {
    clearSelectedNode();
  }, [clearSelectedNode]);

  const handleResetLayout = useCallback(() => {
    setNodes(layoutNodes);
  }, [layoutNodes, setNodes]);

  const isAnyFocusActive = (highlightedNodeIds && highlightedNodeIds.length > 0) || focusedApplicationId !== null;

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-50 overflow-hidden flex-1">
      {/* Active Graph Focus Banner Overlay */}
      {isAnyFocusActive && (
        <div className="absolute top-4 right-4 z-30 bg-blue-950/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-blue-600/80 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
          <span>
            {focusedApplicationId !== null ? 'Application Focus Mode' : `AI Highlight (${highlightedNodeIds.length} Nodes)`}
          </span>
          <button
            onClick={clearGraphFocus}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors ml-1 cursor-pointer"
            title="Clear Focus"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear focus</span>
          </button>
        </div>
      )}

      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#94A3B8', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#CBD5E1" />
        <GraphToolbar onResetLayout={handleResetLayout} />
        <GraphLegend />
      </ReactFlow>
    </div>
  );
};
