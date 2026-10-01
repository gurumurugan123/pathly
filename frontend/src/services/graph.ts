import { apiRequest } from './api';

export const fetchGraphData = () => apiRequest<any>('/graph/');
