import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship, StatusEvent, FollowUp
from apps.applications.models import JobPosition, Application, ApplicationContact, ApplicationStatusEvent

class Command(BaseCommand):
    help = 'Seeds realistic demo data for Phase 1 and Phase 2 testing in development mode.'

    def handle(self, *args, **options):
        is_dev = getattr(settings, 'DEBUG', False) or os.environ.get('ENVIRONMENT', 'development') == 'development'
        if not is_dev:
            raise CommandError("Demo seed data can only be run in development/test environments!")

        self.stdout.write("Seeding demo data for development...")

        # Create or update demo user
        demo_user, _ = User.objects.get_or_create(
            username='demo',
            defaults={
                'email': 'demo@jobgraph.com',
                'first_name': 'Demo',
                'last_name': 'User'
            }
        )
        demo_user.set_password('password123')
        demo_user.save()

        self.stdout.write(f"Demo user '{demo_user.username}' ready (password: password123).")

        # Demo Companies
        companies_data = [
            {"name": "Zoho", "website": "https://zoho.com", "industry": "Software / SaaS", "location": "Chennai, TN"},
            {"name": "Cognizant", "website": "https://cognizant.com", "industry": "IT Services", "location": "Chennai, TN"},
            {"name": "TCS", "website": "https://tcs.com", "industry": "IT Consulting", "location": "Chennai, TN"},
            {"name": "Infosys", "website": "https://infosys.com", "industry": "IT Consulting", "location": "Bengaluru, KA"},
            {"name": "perks", "website": "https://perks.co", "industry": "Fintech / SaaS", "location": "Remote"},
        ]

        companies_map = {}
        for cdata in companies_data:
            company, _ = Company.objects.get_or_create(
                user=demo_user,
                normalized_name=cdata["name"].lower(),
                defaults={
                    "name": cdata["name"],
                    "website": cdata["website"],
                    "industry": cdata["industry"],
                    "location": cdata["location"]
                }
            )
            companies_map[cdata["name"]] = company

        # Demo People & Relationships
        people_specs = [
            # Zoho
            {"name": "Ramesh", "designation": "Staff Engineer", "company": "Zoho", "status": "RESUME_ACCEPTED", "email": "ramesh@zoho.com", "linkedin": "https://linkedin.com/in/ramesh-zoho"},
            {"name": "Suresh", "designation": "Software Developer", "company": "Zoho", "status": "REPLIED", "email": "suresh@zoho.com", "linkedin": "https://linkedin.com/in/suresh-kumar"},
            {"name": "Lake", "designation": "Product Manager", "company": "Zoho", "status": "RESUME_SENT", "email": "lake@zoho.com", "linkedin": "https://linkedin.com/in/lake-zoho"},
            {"name": "Ram", "designation": "Engineering Director", "company": "Zoho", "status": "REFERRAL_GIVEN", "email": "ram@zoho.com", "linkedin": "https://linkedin.com/in/ram-zoho"},

            # Cognizant
            {"name": "Linga", "designation": "Tech Lead", "company": "Cognizant", "status": "RESUME_ACCEPTED", "email": "linga@cognizant.com", "linkedin": "https://linkedin.com/in/linga-cognizant"},
            {"name": "Langa", "designation": "Senior Developer", "company": "Cognizant", "status": "REPLIED", "email": "langa@cognizant.com", "linkedin": "https://linkedin.com/in/langa-cognizant"},
            {"name": "Govinth", "designation": "QA Lead", "company": "Cognizant", "status": "RESUME_SENT", "email": "govinth@cognizant.com", "linkedin": "https://linkedin.com/in/govinth-cognizant"},

            # TCS
            {"name": "Balan", "designation": "Solution Architect", "company": "TCS", "status": "RESUME_ACCEPTED", "email": "balan@tcs.com", "linkedin": "https://linkedin.com/in/balan-tcs"},
            {"name": "Harish", "designation": "Fullstack Developer", "company": "TCS", "status": "RESUME_SENT", "email": "harish@tcs.com", "linkedin": "https://linkedin.com/in/harish-tcs"},
            {"name": "Karthik", "designation": "Engineering Manager", "company": "TCS", "status": "REPLIED", "email": "karthik@tcs.com", "linkedin": "https://linkedin.com/in/karthik-tcs"},
            {"name": "Prakash", "designation": "DevOps Engineer", "company": "TCS", "status": "RESUME_SENT", "email": "prakash@tcs.com", "linkedin": "https://linkedin.com/in/prakash-tcs"},

            # Infosys
            {"name": "Manoj", "designation": "Principal Architect", "company": "Infosys", "status": "WILL_REFER", "email": "manoj@infosys.com", "linkedin": "https://linkedin.com/in/manoj-infosys"},
        ]

        people_map = {}
        for pspec in people_specs:
            company = companies_map[pspec["company"]]
            person, _ = Person.objects.get_or_create(
                user=demo_user,
                name=pspec["name"],
                defaults={
                    "designation": pspec["designation"],
                    "email": pspec["email"],
                    "location": "Chennai, TN",
                    "linkedin_url": pspec["linkedin"],
                    "company": company
                }
            )
            people_map[pspec["name"]] = person

            rel, rel_created = Relationship.objects.get_or_create(
                user=demo_user,
                person=person,
                defaults={"current_status": pspec["status"]}
            )

            if not rel_created and rel.current_status != pspec["status"]:
                rel.current_status = pspec["status"]
                rel.save()

            if not rel.status_events.exists():
                StatusEvent.objects.create(
                    relationship=rel,
                    from_status="CONTACT_FOUND",
                    to_status=pspec["status"],
                    note=f"Initial seeded status: {pspec['status']}",
                    created_by=demo_user
                )

        # Demo Job Positions & Applications
        apps_data = [
            {
                "company": "Zoho",
                "title": "Senior Python Fullstack Developer",
                "url": "https://zoho.com/careers/python-dev",
                "status": "INTERVIEW",
                "contacts": [("Suresh", "REFERRAL_CONTACT"), ("Ramesh", "CONTACT")]
            },
            {
                "company": "Cognizant",
                "title": "Technical Lead - React / Python",
                "url": "https://cognizant.com/careers/tech-lead",
                "status": "REFERRAL_GIVEN",
                "contacts": [("Linga", "REFERRAL_CONTACT")]
            },
            {
                "company": "TCS",
                "title": "Solution Architect",
                "url": "https://tcs.com/careers/architect",
                "status": "APPLIED",
                "contacts": [("Balan", "CONTACT")]
            },
            {
                "company": "Infosys",
                "title": "Backend Engineering Manager",
                "url": "https://infosys.com/careers/em",
                "status": "SCREENING",
                "contacts": [("Manoj", "HIRING_MANAGER")]
            },
            {
                "company": "perks",
                "title": "Senior Frontend Engineer",
                "url": "https://perks.co/careers/frontend",
                "status": "SAVED",
                "contacts": []
            }
        ]

        now = timezone.now()

        for adata in apps_data:
            company = companies_map[adata["company"]]
            jp, _ = JobPosition.objects.get_or_create(
                user=demo_user,
                company=company,
                title=adata["title"],
                defaults={
                    "url": adata["url"],
                    "location": company.location,
                    "employment_type": "Full-time",
                    "source": "LinkedIn"
                }
            )

            app, app_created = Application.objects.get_or_create(
                user=demo_user,
                job_position=jp,
                defaults={
                    "current_status": adata["status"],
                    "applied_at": now - timezone.timedelta(days=5)
                }
            )

            if not app.status_events.exists():
                ApplicationStatusEvent.objects.create(
                    application=app,
                    from_status="SAVED",
                    to_status=adata["status"],
                    note=f"Initial seeded application status: {adata['status']}",
                    created_by=demo_user
                )

            for cname, crole in adata["contacts"]:
                if cname in people_map:
                    ApplicationContact.objects.get_or_create(
                        application=app,
                        person=people_map[cname],
                        defaults={"relationship_role": crole}
                    )

        # Demo Follow-ups
        followups_data = [
            {
                "title": "Send thank-you email after Zoho technical round",
                "description": "Confirm next interview timeline with HR",
                "due_date": now + timezone.timedelta(hours=2),
                "completed": False
            },
            {
                "title": "Follow up with Linga regarding Cognizant referral status",
                "description": "Ask if resume was routed to hiring manager",
                "due_date": now + timezone.timedelta(days=1),
                "completed": False
            },
            {
                "title": "Prepare system design notes for Infosys screening",
                "description": "Review microservices architectures",
                "due_date": now + timezone.timedelta(days=2),
                "completed": False
            }
        ]

        for fdata in followups_data:
            FollowUp.objects.get_or_create(
                user=demo_user,
                title=fdata["title"],
                defaults={
                    "description": fdata["description"],
                    "due_date": fdata["due_date"],
                    "completed": fdata["completed"]
                }
            )

        self.stdout.write(self.style.SUCCESS("Demo seed data successfully loaded for Phase 1 & Phase 2!"))
