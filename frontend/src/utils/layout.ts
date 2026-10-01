import type { Node, Edge } from '@xyflow/react';
import { getStatusConfig } from '../config/statuses';

export function computeRadialLayout(
  rawNodes: Node[],
  rawEdges: Edge[],
  searchQuery: string = '',
  statusFilter: string = 'ALL',
  focusedCompanyId: number | null = null,
  focusedContactIds: number[] = []
): { nodes: Node[]; edges: Edge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const query = searchQuery.trim().toLowerCase();
  const hasAppFocus = focusedCompanyId !== null;

  const userNode = rawNodes.find((n) => n.id === 'user-root' || n.type === 'userNode');
  const companyNodes = rawNodes.filter((n) => n.type === 'companyNode');
  const personNodes = rawNodes.filter((n) => n.type === 'personNode');

  const layoutNodes: Node[] = [];

  if (userNode) {
    layoutNodes.push({
      ...userNode,
      position: { x: 0, y: 0 },
      data: {
        ...userNode.data,
        isSearchMatch: query ? (userNode.data.name as string || '').toLowerCase().includes(query) : false,
        isDimmed: false,
      }
    });
  }

  const numCompanies = companyNodes.length;
  const companyRadius = Math.max(360, numCompanies * 80);

  const companyPositions: Record<number | string, { x: number; y: number; angle: number }> = {};

  companyNodes.forEach((compNode, idx) => {
    const angle = (2 * Math.PI * idx) / (numCompanies || 1) - Math.PI / 2;
    const cx = companyRadius * Math.cos(angle);
    const cy = companyRadius * Math.sin(angle);

    const companyId = compNode.data.id as number;
    companyPositions[companyId] = { x: cx, y: cy, angle };

    const compName = (compNode.data.name as string || '').toLowerCase();
    const isSearchMatch = query ? compName.includes(query) : false;

    // Check application focus match
    const isFocusedCompany = hasAppFocus && companyId === focusedCompanyId;
    const isDimmedByApp = hasAppFocus ? !isFocusedCompany : false;

    layoutNodes.push({
      ...compNode,
      position: { x: cx - 80, y: cy - 40 },
      data: {
        ...compNode.data,
        isSearchMatch,
        isFocusedCompany,
        isDimmed: (query ? !isSearchMatch : false) || isDimmedByApp,
      }
    });
  });

  const peopleByCompany: Record<string | number, Node[]> = {};
  const unassignedPeople: Node[] = [];

  personNodes.forEach((personNode) => {
    const companyId = personNode.data.companyId as number | null;
    if (companyId && companyPositions[companyId]) {
      if (!peopleByCompany[companyId]) {
        peopleByCompany[companyId] = [];
      }
      peopleByCompany[companyId].push(personNode);
    } else {
      unassignedPeople.push(personNode);
    }
  });

  Object.keys(peopleByCompany).forEach((compKey) => {
    const people = peopleByCompany[compKey];
    const compPos = companyPositions[compKey];
    const numPeople = people.length;
    const sectorRadius = 190 + Math.floor(numPeople / 5) * 40;

    const arcSpread = Math.min(Math.PI * 0.95, Math.max(Math.PI * 0.45, numPeople * 0.32));
    const startAngle = compPos.angle - arcSpread / 2;

    people.forEach((personNode, pIdx) => {
      const stepAngle = numPeople > 1 ? startAngle + (arcSpread * pIdx) / (numPeople - 1) : compPos.angle;
      const px = compPos.x + sectorRadius * Math.cos(stepAngle);
      const py = compPos.y + sectorRadius * Math.sin(stepAngle);

      const pData = personNode.data;
      const personId = pData.id as number;

      const nameMatch = (pData.name as string || '').toLowerCase().includes(query);
      const desigMatch = (pData.designation as string || '').toLowerCase().includes(query);
      const compMatch = (pData.companyName as string || '').toLowerCase().includes(query);
      const statusMatch = (pData.status as string || '').toLowerCase().includes(query);

      const isSearchMatch = query ? (nameMatch || desigMatch || compMatch || statusMatch) : false;
      const isStatusMatch = statusFilter === 'ALL' || pData.status === statusFilter;

      const isFocusedContact = hasAppFocus && (focusedContactIds.includes(personId) || Number(compKey) === focusedCompanyId);
      const isDimmedByApp = hasAppFocus ? !isFocusedContact : false;

      const isDimmed = (query && !isSearchMatch) || !isStatusMatch || isDimmedByApp;

      layoutNodes.push({
        ...personNode,
        position: { x: px - 50, y: py - 30 },
        data: {
          ...pData,
          isSearchMatch,
          isFocusedContact,
          isDimmed,
        }
      });
    });
  });

  if (unassignedPeople.length > 0) {
    const freeRadius = companyRadius + 260;
    unassignedPeople.forEach((personNode, pIdx) => {
      const angle = (2 * Math.PI * pIdx) / unassignedPeople.length;
      const px = freeRadius * Math.cos(angle);
      const py = freeRadius * Math.sin(angle);

      const pData = personNode.data;
      const personId = pData.id as number;

      const isSearchMatch = query ? (pData.name as string || '').toLowerCase().includes(query) : false;
      const isStatusMatch = statusFilter === 'ALL' || pData.status === statusFilter;

      const isFocusedContact = hasAppFocus && focusedContactIds.includes(personId);
      const isDimmedByApp = hasAppFocus ? !isFocusedContact : false;

      const isDimmed = (query && !isSearchMatch) || !isStatusMatch || isDimmedByApp;

      layoutNodes.push({
        ...personNode,
        position: { x: px - 50, y: py - 30 },
        data: {
          ...pData,
          isSearchMatch,
          isFocusedContact,
          isDimmed,
        }
      });
    });
  }

  const nodeDimMap: Record<string, boolean> = {};
  layoutNodes.forEach((n) => {
    nodeDimMap[n.id] = !!n.data.isDimmed;
  });

  const updatedEdges = rawEdges.map((edge) => {
    const isSourceDimmed = nodeDimMap[edge.source];
    const isTargetDimmed = nodeDimMap[edge.target];
    const isEdgeDimmed = isSourceDimmed || isTargetDimmed;

    const edgeStatus = edge.data?.status as string | undefined;
    let strokeColor = '#CBD5E1';

    if (edge.data?.type === 'user-company') {
      strokeColor = '#94A3B8';
    } else if (edgeStatus) {
      strokeColor = getStatusConfig(edgeStatus).color;
    }

    return {
      ...edge,
      style: {
        ...edge.style,
        stroke: strokeColor,
        opacity: isEdgeDimmed ? 0.15 : 0.85,
        strokeWidth: edge.data?.type === 'user-company' ? 2.5 : 2,
      }
    };
  });

  return { nodes: layoutNodes, edges: updatedEdges };
}
