"""
Centralized status definitions for JobGraph backend.
"""

STATUS_CONFIG = [
    {
        "key": "CONTACT_FOUND",
        "label": "Contact Found",
        "category": "Discovery",
        "order": 1,
        "color": "#94A3B8",  # slate-400
    },
    {
        "key": "CONTACTED",
        "label": "Contacted",
        "category": "Outreach",
        "order": 2,
        "color": "#38BDF8",  # sky-400
    },
    {
        "key": "RESUME_SENT",
        "label": "Resume Sent",
        "category": "Outreach",
        "order": 3,
        "color": "#3B82F6",  # blue-500
    },
    {
        "key": "RESUME_ACCEPTED",
        "label": "Resume Accepted",
        "category": "Engagement",
        "order": 4,
        "color": "#14B8A6",  # teal-500
    },
    {
        "key": "REPLIED",
        "label": "Replied",
        "category": "Engagement",
        "order": 5,
        "color": "#F97316",  # orange-500
    },
    {
        "key": "WILL_REFER",
        "label": "Willing to Refer",
        "category": "Referral",
        "order": 6,
        "color": "#6366F1",  # indigo-500
    },
    {
        "key": "REFERRAL_GIVEN",
        "label": "Referral Given",
        "category": "Referral",
        "order": 7,
        "color": "#8B5CF6",  # purple-500
    },
    {
        "key": "INTERVIEW",
        "label": "Interviewing",
        "category": "Active",
        "order": 8,
        "color": "#10B981",  # emerald-500
    },
    {
        "key": "OFFER",
        "label": "Offer Received",
        "category": "Active",
        "order": 9,
        "color": "#22C55E",  # green-500
    },
    {
        "key": "HIRED",
        "label": "Hired",
        "category": "Success",
        "order": 10,
        "color": "#059669",  # emerald-600
    },
    {
        "key": "REJECTED",
        "label": "Passed / Rejected",
        "category": "Closed",
        "order": 11,
        "color": "#F43F5E",  # rose-500
    },
    {
        "key": "NO_RESPONSE",
        "label": "No Response",
        "category": "Closed",
        "order": 12,
        "color": "#64748B",  # slate-500
    },
    {
        "key": "NOT_INTERESTED",
        "label": "Not Interested",
        "category": "Closed",
        "order": 13,
        "color": "#71717A",  # zinc-500
    },
    {
        "key": "CLOSED",
        "label": "Closed",
        "category": "Closed",
        "order": 14,
        "color": "#475569",  # slate-600
    },
]

STATUS_CHOICES = [(item["key"], item["label"]) for item in STATUS_CONFIG]
VALID_STATUS_KEYS = {item["key"] for item in STATUS_CONFIG}
