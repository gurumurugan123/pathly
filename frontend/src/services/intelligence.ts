import { apiRequest } from './api';

export interface Recommendation {
  id: number;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  reason: string;
  entity_type: string;
  entity_id: number | null;
  deduplication_key: string;
  metadata: Record<string, any>;
  status: 'NEW' | 'VIEWED' | 'DISMISSED' | 'COMPLETED' | 'SNOOZED';
  expires_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  entity_type: string;
  entity_id: number | null;
  recommendation: number | null;
  created_at: string;
}

export interface NotificationResponse {
  unread_count: number;
  notifications: NotificationItem[];
}

export interface DailyBrief {
  date: string;
  due_followups_count: number;
  apps_without_referral_count: number;
  recent_replies_count: number;
  active_applications_count: number;
  brief_highlights: string[];
  top_recommendation_count: number;
}

export interface GraphOverlayResponse {
  mode: string;
  emphasized_node_ids: string[];
  metadata: Record<string, any>;
}

export const fetchRecommendations = () =>
  apiRequest<Recommendation[]>('/intelligence/recommendations/');

export const postRecommendationAction = (id: number, actionType: 'view' | 'dismiss' | 'complete' | 'snooze') =>
  apiRequest<{ message: string; recommendation: Recommendation }>(`/intelligence/recommendations/${id}/${actionType}/`, {
    method: 'POST',
  });

export const fetchDailyBrief = () =>
  apiRequest<DailyBrief>('/intelligence/brief/');

export const fetchReferralOpportunities = () =>
  apiRequest<any[]>('/intelligence/referral-opportunities/');

export const fetchNetworkGaps = () =>
  apiRequest<any[]>('/intelligence/network-gaps/');

export const fetchApplicationRisks = () =>
  apiRequest<any[]>('/intelligence/application-risks/');

export const fetchCompanyInsights = () =>
  apiRequest<any[]>('/intelligence/company-insights/');

export const fetchGraphOverlay = (mode: string) =>
  apiRequest<GraphOverlayResponse>(`/intelligence/graph-overlay/?mode=${mode}`);

export const fetchNotifications = () =>
  apiRequest<NotificationResponse>('/intelligence/notifications/');

export const postNotificationRead = (id?: number) => {
  const url = id ? `/intelligence/notifications/${id}/read/` : '/intelligence/notifications/read-all/';
  return apiRequest<{ message: string }>(url, { method: 'POST' });
};
