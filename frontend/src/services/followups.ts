import { apiRequest } from './api';
import type { FollowUp } from '../types';

export const fetchFollowUps = (filter?: 'today' | 'upcoming' | 'overdue', completed?: boolean) => {
  const params = new URLSearchParams();
  if (filter) params.append('filter', filter);
  if (completed !== undefined) params.append('completed', String(completed));
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<FollowUp[]>(`/follow-ups/${query}`);
};

export const createFollowUp = (data: {
  title: string;
  description?: string;
  due_date: string;
  application?: number;
  relationship?: number;
}) => apiRequest<FollowUp>('/follow-ups/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateFollowUp = (id: number, data: Partial<FollowUp>) =>
  apiRequest<FollowUp>(`/follow-ups/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
