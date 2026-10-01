import { api } from './api';

export interface UserSettings {
  theme: string;
  notify_recommendations: boolean;
  notify_followups: boolean;
  notify_applications: boolean;
  notify_interviews: boolean;
  notify_goals: boolean;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await api.get('/auth/settings/');
  return response.data;
}

export async function updateUserSettings(data: Partial<UserSettings>): Promise<UserSettings> {
  const response = await api.patch('/auth/settings/', data);
  return response.data;
}

export async function updateUserProfile(data: { first_name?: string; last_name?: string; username?: string }): Promise<UserProfile> {
  const response = await api.patch('/auth/me/', data);
  return response.data;
}

export async function changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<{ message: string }> {
  const response = await api.post('/auth/change-password/', data);
  return response.data;
}

export async function deleteAccount(confirmation: string): Promise<{ message: string }> {
  const response = await api.delete('/auth/delete-account/', { data: { confirmation } });
  return response.data;
}

export async function exportUserData(): Promise<any> {
  const response = await api.get('/auth/export-data/');
  return response.data;
}
