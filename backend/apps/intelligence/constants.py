RECOMMENDATION_TYPES = [
    ('FOLLOW_UP', 'Follow Up Required'),
    ('REFERRAL_OPPORTUNITY', 'Referral Opportunity Detected'),
    ('APPLICATION_ACTION', 'Application Action Required'),
    ('RELATIONSHIP_OPPORTUNITY', 'Relationship Opportunity'),
    ('NETWORK_GAP', 'Network Gap Identified'),
    ('PIPELINE_RISK', 'Pipeline Risk'),
    ('COMPANY_OPPORTUNITY', 'Company Opportunity'),
    ('INTERVIEW_PREPARATION', 'Interview Preparation'),
    ('APPLICATION_STALE', 'Stale Application'),
    ('CONTACT_STALE', 'Stale Contact Interaction'),
    ('REFERRAL_MISSING', 'Referral Missing'),
    ('GENERAL_INSIGHT', 'General Career Insight'),
]

PRIORITY_CHOICES = [
    ('LOW', 'Low Priority'),
    ('MEDIUM', 'Medium Priority'),
    ('HIGH', 'High Priority'),
]

STATUS_CHOICES = [
    ('NEW', 'New'),
    ('VIEWED', 'Viewed'),
    ('DISMISSED', 'Dismissed'),
    ('COMPLETED', 'Completed'),
    ('SNOOZED', 'Snoozed'),
]

EVENT_TYPES = [
    ('VIEWED', 'Viewed'),
    ('DISMISSED', 'Dismissed'),
    ('COMPLETED', 'Completed'),
    ('SNOOZED', 'Snoozed'),
    ('ACTION_TAKEN', 'Action Taken'),
]

GRAPH_MODES = [
    ('NORMAL', 'Normal Mode'),
    ('RELATIONSHIP_STRENGTH', 'Relationship Strength'),
    ('REFERRAL_OPPORTUNITIES', 'Referral Opportunities'),
    ('APPLICATION_FOCUS', 'Application Focus'),
    ('FOLLOW_UPS', 'Follow Ups'),
    ('COMPANY_COVERAGE', 'Company Coverage'),
]
