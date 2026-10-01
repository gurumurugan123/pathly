export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface Company {
  id: number;
  name: string;
  normalized_name: string;
  website: string;
  industry: string;
  location: string;
  notes: string;
  logo_url: string;
  people_count: number;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: number;
  name: string;
  designation: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  company: number | null;
  company_detail?: {
    id: number;
    name: string;
    website: string;
    industry: string;
    location: string;
  } | null;
  current_status: string;
  relationship_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface StatusEvent {
  id: number;
  from_status: string;
  to_status: string;
  note: string;
  timestamp: string;
  created_by_username?: string;
}

export interface Note {
  id: number;
  content: string;
  created_at: string;
}

export interface Relationship {
  id: number;
  person: number;
  person_name: string;
  company_name: string;
  current_status: string;
  connection_type: string;
  status_events: StatusEvent[];
  notes: Note[];
  created_at: string;
  updated_at: string;
}

export interface Stats {
  totalPeople: number;
  resumeAccepted: number;
  replied: number;
  willRefer: number;
  referralGiven: number;
  contactFound: number;
  contacted: number;
  resumeSent: number;
}

export interface StatusConfigItem {
  key: string;
  label: string;
  category: string;
  order: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export interface GraphNodeData {
  id: number;
  label?: string;
  name: string;
  email?: string;
  designation?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  website?: string;
  industry?: string;
  peopleCount?: number;
  logoUrl?: string;
  companyId?: number | null;
  companyName?: string | null;
  status?: string;
  relationshipId?: number | null;
}

// Phase 2 Additions
export interface JobPosition {
  id: number;
  company: number;
  company_name: string;
  title: string;
  description: string;
  url: string;
  location: string;
  employment_type: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationContact {
  id: number;
  application: number;
  person: number;
  person_name: string;
  person_designation: string;
  person_email: string;
  person_linkedin: string;
  relationship_role: string;
  notes: string;
  created_at: string;
}

export interface ApplicationStatusEvent {
  id: number;
  from_status: string;
  to_status: string;
  note: string;
  timestamp: string;
  created_by_username?: string;
}

export interface Application {
  id: number;
  job_position: number;
  job_title: string;
  job_url: string;
  job_location: string;
  employment_type: string;
  source: string;
  company_id: number;
  company_name: string;
  current_status: string;
  applied_at: string | null;
  contacts: ApplicationContact[];
  primary_contact_name: string | null;
  primary_contact_id: number | null;
  status_events?: ApplicationStatusEvent[];
  follow_ups?: FollowUp[];
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: number;
  user?: number;
  relationship?: number | null;
  application?: number | null;
  person_name?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  title: string;
  description: string;
  note?: string;
  due_date: string;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface AnalyticsData {
  metrics: {
    totalApplications: number;
    activeApplications: number;
    interviews: number;
    offers: number;
    hired: number;
    referralApplications: number;
    referralConversionRate: number;
  };
  statusDistribution: Record<string, number>;
  topCompanies: Array<{ job_position__company__name: string; count: number }>;
}
