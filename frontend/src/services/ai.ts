import { apiRequest } from './api';

export interface PendingMutation {
  action: string;
  params: Record<string, any>;
  summary: {
    entity_type: string;
    entity_name: string;
    company_name?: string;
    current_status?: string;
    new_status?: string;
    due_date?: string;
    associated_with?: string;
    content?: string;
  };
}

export interface AIQueryResponse {
  query: string;
  interpretation: string;
  text: string;
  selectedPeople: string[];
  selectedCompanies: string[];
  selectedApplications: string[];
  people?: { id: number; name: string; company: string }[];
  companies?: { id: number; name: string }[];
  applications?: { id: number; title: string; company: string }[];
  pendingMutation?: PendingMutation | null;
}

export interface AIMutationResult {
  success: boolean;
  message: string;
  entity: any;
}

export const postAIQuery = (query: string) =>
  apiRequest<AIQueryResponse>('/ai/query/', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });

export const executeAIMutation = (action: string, params: Record<string, any>) =>
  apiRequest<AIMutationResult>('/ai/execute-mutation/', {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });
