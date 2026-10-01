import {
  LayoutDashboard,
  Briefcase,
  GitCommit,
  BarChart3,
  Building2,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard Graph', path: '/dashboard', icon: LayoutDashboard },
  { id: 'applications', label: 'Applications', path: '/applications', icon: Briefcase },
  { id: 'pipeline', label: 'Pipeline Board', path: '/pipeline', icon: GitCommit },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { id: 'companies', label: 'Companies', path: '/companies', icon: Building2 },
  { id: 'people', label: 'People Network', path: '/people', icon: Users },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];
