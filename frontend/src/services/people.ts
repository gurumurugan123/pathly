import { api } from './api';

export interface PersonItem {
  id: number;
  name: string;
  designation: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  company: number | null;
  company_detail: {
    id: number;
    name: string;
    website: string;
    industry: string;
    location: string;
  } | null;
  current_status: string;
  relationship_id: number | null;
  connection_type: string;
  applications_count: number;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeopleStats {
  total_people: number;
  replied: number;
  will_refer: number;
  referral_given: number;
}

export async function fetchPeople(params?: { search?: string; status?: string; company_id?: string }): Promise<PersonItem[]> {
  const response = await api.get('/people/', { params });
  return response.data.results || response.data;
}

export async function fetchPeopleStats(): Promise<PeopleStats> {
  const response = await api.get('/people/stats/');
  return response.data;
}

export async function fetchPersonDetails(id: number): Promise<PersonItem> {
  const response = await api.get(`/people/${id}/`);
  return response.data;
}

export const fetchPersonDetail = fetchPersonDetails;

export async function createPerson(data: {
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  company_name?: string;
  company?: number;
  initial_status?: string;
}): Promise<PersonItem> {
  const response = await api.post('/people/', data);
  return response.data;
}

export async function updatePerson(id: number, data: Partial<PersonItem>): Promise<PersonItem> {
  const response = await api.patch(`/people/${id}/`, data);
  return response.data;
}

export async function deletePerson(id: number, force: boolean = false): Promise<any> {
  const response = await api.delete(`/people/${id}/`, {
    params: { force: force ? 'true' : 'false' }
  });
  return response.data;
}
