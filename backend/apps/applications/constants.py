"""
Centralized Application status definitions for JobGraph backend.
"""

APPLICATION_STATUS_CONFIG = [
    {
        "key": "SAVED",
        "label": "Saved",
        "category": "Discovery",
        "order": 1,
        "color": "#94A3B8",
    },
    {
        "key": "APPLIED",
        "label": "Applied",
        "category": "Active",
        "order": 2,
        "color": "#3B82F6",
    },
    {
        "key": "REFERRAL_REQUESTED",
        "label": "Referral Requested",
        "category": "Referral",
        "order": 3,
        "color": "#6366F1",
    },
    {
        "key": "REFERRAL_GIVEN",
        "label": "Referral Given",
        "category": "Referral",
        "order": 4,
        "color": "#8B5CF6",
    },
    {
        "key": "SCREENING",
        "label": "Initial Screening",
        "category": "Interview",
        "order": 5,
        "color": "#38BDF8",
    },
    {
        "key": "INTERVIEW",
        "label": "Interviewing",
        "category": "Interview",
        "order": 6,
        "color": "#10B981",
    },
    {
        "key": "TECHNICAL_INTERVIEW",
        "label": "Technical Interview",
        "category": "Interview",
        "order": 7,
        "color": "#0D9488",
    },
    {
        "key": "HR_INTERVIEW",
        "label": "HR Interview",
        "category": "Interview",
        "order": 8,
        "color": "#0284C7",
    },
    {
        "key": "OFFER",
        "label": "Offer Received",
        "category": "Success",
        "order": 9,
        "color": "#22C55E",
    },
    {
        "key": "HIRED",
        "label": "Hired",
        "category": "Success",
        "order": 10,
        "color": "#059669",
    },
    {
        "key": "REJECTED",
        "label": "Rejected",
        "category": "Closed",
        "order": 11,
        "color": "#F43F5E",
    },
    {
        "key": "WITHDRAWN",
        "label": "Withdrawn",
        "category": "Closed",
        "order": 12,
        "color": "#64748B",
    },
    {
        "key": "CLOSED",
        "label": "Closed",
        "category": "Closed",
        "order": 13,
        "color": "#475569",
    },
]

APPLICATION_STATUS_CHOICES = [(item["key"], item["label"]) for item in APPLICATION_STATUS_CONFIG]
VALID_APP_STATUS_KEYS = {item["key"] for item in APPLICATION_STATUS_CONFIG}

APPLICATION_CONTACT_ROLES = [
    ("CONTACT", "General Contact"),
    ("REFERRAL_CONTACT", "Referral Contact"),
    ("RECRUITER", "Recruiter / Talent Partner"),
    ("HIRING_MANAGER", "Hiring Manager"),
    ("INTERVIEWER", "Interviewer"),
]
