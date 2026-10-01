import { api } from './api';

export interface CompanyItem {
  id: number;
  name: string;
  normalized_name: string;
  website: string;
  industry: string;
  location: string;
  notes: string;
  logo_url: string;
  people_count: number;
  applications_count: number;
  active_applications_count: number;
  referral_contacts_count: number;
  last_activity: string | null;
  has_referral: boolean;
  has_contacts: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyStats {
  total_companies: number;
  active_applications: number;
  people_connected: number;
  referral_opportunities: number;
}

export async function fetchCompanies(params?: { search?: string; filter?: string }): Promise<CompanyItem[]> {
  const response = await api.get('/companies/', { params });
  return response.data.results || response.data;
}

export async function fetchCompanyStats(): Promise<CompanyStats> {
  const response = await api.get('/companies/stats/');
  return response.data;
}

export async function fetchCompanyDetails(id: number): Promise<CompanyItem> {
  const response = await api.get(`/companies/${id}/`);
  return response.data;
}

export const fetchCompanyDetail = fetchCompanyDetails;

export async function createCompany(data: { name: string; website?: string; industry?: string; location?: string; notes?: string }): Promise<CompanyItem> {
  const response = await api.post('/companies/', data);
  return response.data;
}

export async function updateCompany(id: number, data: Partial<CompanyItem>): Promise<CompanyItem> {
  const response = await api.patch(`/companies/${id}/`, data);
  return response.data;
}

export async function deleteCompany(id: number, force: boolean = false): Promise<any> {
  const response = await api.delete(`/companies/${id}/`, {
    params: { force: force ? 'true' : 'false' }
  });
  return response.data;
}
