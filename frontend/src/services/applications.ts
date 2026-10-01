import { apiRequest } from './api';
import type { Application, ApplicationContact, ApplicationStatusEvent } from '../types';

export const fetchApplications = () => apiRequest<Application[]>('/applications/');

export const fetchApplicationDetail = (id: number) => apiRequest<Application>(`/applications/${id}/`);

export const createApplication = (data: {
  company_input: string;
  job_title_input: string;
  job_url_input?: string;
  current_status?: string;
}) => apiRequest<Application>('/applications/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateApplication = (id: number, data: Partial<Application>) =>
  apiRequest<Application>(`/applications/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateApplicationStatus = (id: number, status: string, note?: string) =>
  apiRequest<{ application: Application; event: ApplicationStatusEvent }>(`/applications/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });

export const deleteApplication = (id: number) =>
  apiRequest<void>(`/applications/${id}/`, {
    method: 'DELETE',
  });

export const fetchApplicationHistory = (id: number) =>
  apiRequest<ApplicationStatusEvent[]>(`/applications/${id}/history/`);

export const addApplicationContact = (id: number, person_id: number, relationship_role: string = 'CONTACT', notes: string = '') =>
  apiRequest<ApplicationContact>(`/applications/${id}/contacts/`, {
    method: 'POST',
    body: JSON.stringify({ person_id, relationship_role, notes }),
  });

export const removeApplicationContact = (id: number, contact_id: number) =>
  apiRequest<void>(`/applications/${id}/contacts/${contact_id}/`, {
    method: 'DELETE',
  });
