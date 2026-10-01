import { apiRequest } from './api';
import type { Relationship, StatusEvent, Note } from '../types';

export const fetchRelationship = (id: number) => apiRequest<Relationship>(`/relationships/${id}/`);

export const updateRelationshipStatus = (id: number, status: string, note?: string) =>
  apiRequest<{ relationship: Relationship; event: StatusEvent }>(`/relationships/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });

export const fetchStatusHistory = (id: number) =>
  apiRequest<StatusEvent[]>(`/relationships/${id}/history/`);

export const addRelationshipNote = (id: number, content: string) =>
  apiRequest<Note>(`/relationships/${id}/notes/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
