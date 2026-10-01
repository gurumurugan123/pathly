import { apiRequest } from './api';
import type { AnalyticsData } from '../types';

export const fetchAnalytics = () => apiRequest<AnalyticsData>('/analytics/');
