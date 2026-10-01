import re
from django.utils import timezone
from apps.ai.tools import (
    find_people,
    find_companies,
    find_relationships,
    find_applications,
    find_followups,
    get_graph,
    get_person,
    get_company,
    get_application,
    get_analytics,
    update_relationship_status,
    update_application_status,
    create_note,
    create_followup,
    create_application
)
from apps.relationships.constants import STATUS_CHOICES
from apps.applications.constants import APPLICATION_STATUS_CHOICES

STATUS_LABEL_MAP = {
    'CONTACT_FOUND': 'Contact Found',
    'CONTACTED': 'Contacted',
    'REPLIED': 'Replied',
    'RESUME_SENT': 'Resume Sent',
    'RESUME_ACCEPTED': 'Resume Accepted',
    'WILL_REFER': 'Will Refer',
    'REFERRAL_GIVEN': 'Referral Given',
    'INTERVIEW_SCHEDULED': 'Interview Scheduled',
    'OFFER_RECEIVED': 'Offer Received',
    'HIRED': 'Hired',
}

APP_STATUS_LABEL_MAP = {
    'SAVED': 'Saved',
    'APPLIED': 'Applied',
    'REFERRAL_REQUESTED': 'Referral Requested',
    'REFERRAL_GIVEN': 'Referral Given',
    'SCREENING': 'Initial Screening',
    'INTERVIEW': 'Interviewing',
    'TECHNICAL_INTERVIEW': 'Technical Interview',
    'HR_INTERVIEW': 'HR Interview',
    'OFFER': 'Offer Received',
    'HIRED': 'Hired',
    'REJECTED': 'Rejected',
}


def process_user_query(user, query_text):
    """
    Main entry point for processing AI user queries.
    Parses intent, invokes controlled tools, and builds structured response with graph nodes & pending mutations.
    """
    q_lower = query_text.strip().lower()

    response_data = {
        "query": query_text,
        "interpretation": "",
        "text": "",
        "selectedPeople": [],
        "selectedCompanies": [],
        "selectedApplications": [],
        "people": [],
        "companies": [],
        "applications": [],
        "pendingMutation": None
    }

    # ==========================================================================
    # 1. MUTATION INTENTS (REQUIRE CONFIRMATION)
    # ==========================================================================

    # A. Mark person status change (e.g. "Mark Suresh as willing to refer", "Change Suresh status to Will Refer", "Mark Suresh as replied")
    mark_rel_match = re.search(r'(mark|change|set|update)\s+([a-zA-Z0-9\s]+?)\s+(as|to|status to)\s+([a-zA-Z0-9\s]+)', q_lower)
    if mark_rel_match:
        person_query = mark_rel_match.group(2).strip()
        target_status_raw = mark_rel_match.group(4).strip()

        # Check if target match is for person or application
        people = find_people(user, query=person_query)
        if people.exists():
            person = people.first()
            mapped_status = _map_relationship_status(target_status_raw)
            if mapped_status:
                rel = person.relationships.filter(user=user).first()
                current_st = rel.current_status if rel else 'CONTACT_FOUND'
                curr_label = STATUS_LABEL_MAP.get(current_st, current_st)
                new_label = STATUS_LABEL_MAP.get(mapped_status, mapped_status)

                response_data["interpretation"] = f"Request to update {person.name}'s status to '{new_label}'."
                response_data["text"] = f"Please confirm updating **{person.name}** at **{person.company.name if person.company else 'N/A'}**:"
                response_data["selectedPeople"] = [f"person-{person.id}", f"person_{person.id}"]
                if person.company:
                    response_data["selectedCompanies"] = [f"company-{person.company.id}", f"company_{person.company.id}"]
                response_data["pendingMutation"] = {
                    "action": "update_relationship_status",
                    "params": {
                        "person_id": person.id,
                        "new_status": mapped_status,
                        "note": "Updated via AI Assistant"
                    },
                    "summary": {
                        "entity_type": "Person",
                        "entity_name": person.name,
                        "company_name": person.company.name if person.company else "N/A",
                        "current_status": curr_label,
                        "new_status": new_label
                    }
                }
                return response_data

    # B. Create Follow-up intent (e.g. "Create a follow-up for Suresh tomorrow", "Remind me to call Suresh tomorrow")
    if 'follow-up' in q_lower or 'follow up' in q_lower or 'remind' in q_lower:
        if 'create' in q_lower or 'add' in q_lower or 'schedule' in q_lower or 'remind' in q_lower:
            # find person if mentioned
            person = None
            people = find_people(user)
            for p in people:
                if p.name.lower() in q_lower:
                    person = p
                    break

            app = None
            if not person:
                apps = find_applications(user)
                for a in apps:
                    if a.job_position.title.lower() in q_lower or a.job_position.company.name.lower() in q_lower:
                        app = a
                        break

            title = f"Follow up with {person.name}" if person else (f"Follow up for {app.job_position.title}" if app else query_text)
            due_date = timezone.now() + timezone.timedelta(days=1)

            response_data["interpretation"] = f"Request to create a follow-up task: '{title}'."
            response_data["text"] = f"Please confirm creating this follow-up task:"
            if person:
                response_data["selectedPeople"] = [f"person_{person.id}"]
                if person.company:
                    response_data["selectedCompanies"] = [f"company_{person.company.id}"]
            if app:
                response_data["selectedApplications"] = [f"app_{app.id}"]

            response_data["pendingMutation"] = {
                "action": "create_followup",
                "params": {
                    "title": title,
                    "person_id": person.id if person else None,
                    "application_id": app.id if app else None,
                    "due_date": due_date.isoformat()
                },
                "summary": {
                    "entity_type": "Follow-Up Task",
                    "entity_name": title,
                    "due_date": due_date.strftime("%b %d, %Y"),
                    "associated_with": person.name if person else (app.job_position.company.name if app else "General")
                }
            }
            return response_data

    # C. Add note intent (e.g. "Add note to Linga: Met at event")
    note_match = re.search(r'add\s+note\s+to\s+([a-zA-Z0-9\s]+?):\s*(.+)', q_lower)
    if note_match:
        person_query = note_match.group(1).strip()
        note_text = note_match.group(2).strip()
        people = find_people(user, query=person_query)
        if people.exists():
            person = people.first()
            response_data["interpretation"] = f"Request to add note to {person.name}."
            response_data["text"] = f"Please confirm adding note to **{person.name}**:"
            response_data["selectedPeople"] = [f"person_{person.id}"]
            response_data["pendingMutation"] = {
                "action": "create_note",
                "params": {
                    "person_id": person.id,
                    "content": note_text
                },
                "summary": {
                    "entity_type": "Note",
                    "entity_name": f"Note for {person.name}",
                    "content": note_text
                }
            }
            return response_data

    # ==========================================================================
    # PHASE 4 INTELLIGENCE QUERIES
    # ==========================================================================

    if 'referral opportunities' in q_lower or 'referral opportunity' in q_lower:
        from apps.intelligence.services.referral_opportunity_detector import detect_referral_opportunities
        opps = detect_referral_opportunities(user)
        response_data["interpretation"] = "Identified potential referral opportunities."
        if opps:
            opp_titles = [f"**{o['title']}**: {o['description']}" for o in opps]
            response_data["text"] = f"Found **{len(opps)}** referral opportunity:\n" + "\n".join(opp_titles)
            response_data["selectedApplications"] = [f"application-{o['entity_id']}" for o in opps if o['entity_type'] == 'application']
        else:
            response_data["text"] = "No new referral opportunities detected at this time."
        return response_data

    if 'needs' in q_lower and 'attention' in q_lower or 'what should i pay attention to' in q_lower or 'my recommendations' in q_lower:
        from apps.intelligence.services.career_intelligence import get_needs_attention
        recs = get_needs_attention(user)
        response_data["interpretation"] = "Summarized items needing immediate attention."
        if recs:
            rec_texts = [f"• **[{r.priority}] {r.title}**: {r.description}" for r in recs[:5]]
            response_data["text"] = f"**{len(recs)}** items need your attention:\n" + "\n".join(rec_texts)
        else:
            response_data["text"] = "All clear! No pending items require urgent attention."
        return response_data

    if 'at risk' in q_lower or 'stale' in q_lower:
        from apps.intelligence.services.application_intelligence import analyze_application_risks
        risks = analyze_application_risks(user)
        response_data["interpretation"] = "Analyzed application pipeline health and stale stages."
        if risks:
            risk_texts = [f"• **{r['title']}**: {r['description']}" for r in risks]
            response_data["text"] = f"Identified **{len(risks)}** application risk(s):\n" + "\n".join(risk_texts)
            response_data["selectedApplications"] = [f"application-{r['entity_id']}" for r in risks]
        else:
            response_data["text"] = "All active applications are moving along smoothly!"
        return response_data

    if 'explain my relationship' in q_lower or 'relationship strength' in q_lower or 'explain relationship' in q_lower:
        from apps.ai.tools import explain_relationship_tool
        person_match = re.search(r'(?:with|with person|person)?\s+([A-Za-z]+)', query, re.IGNORECASE)
        name = person_match.group(1) if person_match else ""
        info = explain_relationship_tool(user, name)
        if info:
            factors_str = "\n".join([f"  + {f}" for f in info['factors']])
            response_data["interpretation"] = f"Explained relationship strength score for {info['person_name']}."
            response_data["text"] = (
                f"**Relationship Strength for {info['person_name']}** ({info['company_name']}): **{info['category']}** ({info['score']}/100)\n\n"
                f"**Data Factors:**\n{factors_str}"
            )
            response_data["selectedPeople"] = [f"person-{info['person_id']}"]
        else:
            response_data["text"] = f"Could not find relationship details for '{name}'."
        return response_data

    if 'network coverage' in q_lower or 'coverage' in q_lower:
        from apps.intelligence.services.company_intelligence import get_all_company_insights
        insights = get_all_company_insights(user)
        response_data["interpretation"] = "Calculated company network coverage levels."
        summary = [f"• **{c['company_name']}**: {c['coverage_level']} Coverage ({c['contact_count']} contacts, {c['responsive_count']} responsive)" for c in insights]
        response_data["text"] = "**Company Network Coverage Summary:**\n" + "\n".join(summary)
        return response_data

    # ==========================================================================
    # 2. ANALYTICS & STATS QUERIES
    # ==========================================================================

    if 'how many' in q_lower or 'rate' in q_lower or 'most contacts' in q_lower or 'analytics' in q_lower:
        analytics = get_analytics(user)
        metrics = analytics["metrics"]

        if 'contacted' in q_lower:
            count = metrics["contactedPeople"]
            response_data["interpretation"] = f"Counted people you have contacted."
            response_data["text"] = f"You have contacted **{count}** people in your network."
            return response_data

        if 'accepted my resume' in q_lower or 'accepted' in q_lower:
            people = find_people(user, status='RESUME_ACCEPTED')
            count = people.count()
            response_data["interpretation"] = f"Found people who accepted your resume."
            response_data["text"] = f"**{count}** contacts have accepted your resume so far."
            response_data["selectedPeople"] = [f"person-{p.id}" for p in people]
            response_data["selectedCompanies"] = list(set([f"company-{p.company.id}" for p in people if p.company]))
            return response_data

        if 'referral conversion' in q_lower or 'conversion rate' in q_lower:
            rate = metrics["referralConversionRate"]
            response_data["interpretation"] = f"Calculated referral conversion rate."
            response_data["text"] = f"Your current referral conversion rate is **{rate}%**."
            return response_data

        if 'most contacts' in q_lower:
            top_comp = metrics["topCompany"]
            response_data["interpretation"] = f"Identified company with the most activity."
            response_data["text"] = f"**{top_comp}** has the highest activity in your application roster."
            return response_data

        if 'referrals' in q_lower:
            referral_apps = find_applications(user, has_referral=True)
            count = referral_apps.count()
            response_data["interpretation"] = f"Counted applications with referrals."
            response_data["text"] = f"You have **{count}** applications backed by referral contacts or in referral stage."
            response_data["selectedApplications"] = [f"app-{a.id}" for a in referral_apps]
            return response_data

    # ==========================================================================
    # 3. FOLLOW-UPS QUERIES
    # ==========================================================================

    if 'follow up' in q_lower or 'followup' in q_lower:
        followups = find_followups(user, time_filter='pending')
        count = followups.count()
        response_data["interpretation"] = f"Found pending follow-up tasks."
        if count > 0:
            titles = ", ".join([f"'{f.title}' (Due: {f.due_date.strftime('%b %d')})" for f in followups[:3]])
            response_data["text"] = f"You have **{count}** pending follow-ups: {titles}."
            people_ids = [f"person-{f.relationship.person.id}" for f in followups if f.relationship and f.relationship.person]
            response_data["selectedPeople"] = list(set(people_ids))
        else:
            response_data["text"] = "You currently have no pending follow-up tasks!"
        return response_data

    # ==========================================================================
    # 4. APPLICATION QUERIES
    # ==========================================================================

    if 'applications' in q_lower or 'application' in q_lower or 'without a referral' in q_lower:
        if 'without a referral' in q_lower or 'no referral' in q_lower:
            no_ref_apps = find_applications(user, has_referral=False)
            count = no_ref_apps.count()
            response_data["interpretation"] = f"Filtered applications lacking referral contacts."
            if count > 0:
                titles = ", ".join([f"{a.job_position.title} at {a.job_position.company.name}" for a in no_ref_apps[:3]])
                response_data["text"] = f"Found **{count}** applications without referrals: {titles}."
                response_data["selectedApplications"] = [f"app-{a.id}" for a in no_ref_apps]
                response_data["selectedCompanies"] = list(set([f"company-{a.job_position.company.id}" for a in no_ref_apps]))
            else:
                response_data["text"] = "Great job! All your applications have active referral contacts or requested status."
            return response_data

        # General application query
        apps = find_applications(user, query=query_text)
        count = apps.count()
        response_data["interpretation"] = f"Found {count} job applications."
        if count > 0:
            response_data["text"] = f"Found **{count}** matching applications in your roster."
            response_data["selectedApplications"] = [f"app-{a.id}" for a in apps]
            response_data["selectedCompanies"] = list(set([f"company-{a.job_position.company.id}" for a in apps]))
        else:
            response_data["text"] = f"No applications found matching '{query_text}'."
        return response_data

    # ==========================================================================
    # 5. PEOPLE & GRAPH SEARCH QUERIES
    # ==========================================================================

    # Status extraction (e.g. "who replied", "accepted my resume", "will refer", "cognizant network")
    status_filter = None
    if 'replied' in q_lower:
        status_filter = 'REPLIED'
    elif 'accepted' in q_lower or 'accepted my resume' in q_lower:
        status_filter = 'RESUME_ACCEPTED'
    elif 'will refer' in q_lower or 'willing to refer' in q_lower:
        status_filter = 'WILL_REFER'
    elif 'referral given' in q_lower:
        status_filter = 'REFERRAL_GIVEN'

    company_filter = None
    companies = find_companies(user)
    for c in companies:
        if c.name.lower() in q_lower:
            company_filter = c.name
            break

    people = find_people(user, query=None if (company_filter or status_filter) else query_text, status=status_filter, company_name=company_filter)
    count = people.count()

    if count > 0 or company_filter or status_filter:
        person_names = ", ".join([p.name for p in people[:5]])
        comp_str = f" at {company_filter}" if company_filter else ""
        st_str = f" with status '{STATUS_LABEL_MAP.get(status_filter, status_filter)}'" if status_filter else ""

        response_data["interpretation"] = f"Found {count} contacts{comp_str}{st_str}."
        response_data["text"] = f"Found **{count}** matching contacts in your graph: {person_names}."
        response_data["selectedPeople"] = [f"person-{p.id}" for p in people]

        comp_ids = set([f"company-{p.company.id}" for p in people if p.company])
        if company_filter and not comp_ids:
            matching_comp = companies.filter(name__icontains=company_filter).first()
            if matching_comp:
                comp_ids.add(f"company-{matching_comp.id}")
        response_data["selectedCompanies"] = list(comp_ids)
        response_data["people"] = [{"id": p.id, "name": p.name, "company": p.company.name if p.company else ""} for p in people]
        return response_data

    # Default Fallback
    response_data["interpretation"] = "Analyzed query against your career graph."
    response_data["text"] = f"I couldn't find specific contacts or applications matching '{query_text}'. Try asking 'Show everyone from Zoho who replied' or 'Show applications without a referral'."
    return response_data


def execute_mutation_action(user, action_name, params):
    """Executes a confirmed action tool with user isolation."""
    if action_name == 'update_relationship_status':
        person_id = params.get('person_id')
        new_status = params.get('new_status')
        note = params.get('note', '')
        rel, event = update_relationship_status(user, person_id, new_status, note=note)
        return {
            "success": True,
            "message": f"Successfully updated {rel.person.name}'s status to {STATUS_LABEL_MAP.get(new_status, new_status)}.",
            "entity": {"id": rel.person.id, "name": rel.person.name, "status": rel.current_status}
        }

    elif action_name == 'update_application_status':
        app_id = params.get('application_id')
        new_status = params.get('new_status')
        note = params.get('note', '')
        app, event = update_application_status(user, app_id, new_status, note=note)
        return {
            "success": True,
            "message": f"Successfully updated application status for {app.job_position.title} to {APP_STATUS_LABEL_MAP.get(new_status, new_status)}.",
            "entity": {"id": app.id, "title": app.job_position.title, "status": app.current_status}
        }

    elif action_name == 'create_note':
        person_id = params.get('person_id')
        content = params.get('content')
        note_obj = create_note(user, person_id, content)
        return {
            "success": True,
            "message": f"Successfully created note for {note_obj.relationship.person.name}.",
            "entity": {"id": note_obj.id, "content": note_obj.content}
        }

    elif action_name == 'create_followup':
        title = params.get('title')
        due_date = params.get('due_date')
        person_id = params.get('person_id')
        app_id = params.get('application_id')
        followup = create_followup(user, title=title, due_date=due_date, person_id=person_id, application_id=app_id)
        return {
            "success": True,
            "message": f"Successfully scheduled follow-up: '{followup.title}'.",
            "entity": {"id": followup.id, "title": followup.title, "due_date": followup.due_date.isoformat()}
        }

    elif action_name == 'create_application':
        company_name = params.get('company_name')
        job_title = params.get('job_title')
        job_url = params.get('job_url', '')
        status = params.get('status', 'APPLIED')
        app_obj = create_application(user, company_name=company_name, job_title=job_title, job_url=job_url, status=status)
        return {
            "success": True,
            "message": f"Successfully created job application for '{app_obj.job_position.title}' at '{app_obj.job_position.company.name}'.",
            "entity": {"id": app_obj.id, "title": app_obj.job_position.title, "company": app_obj.job_position.company.name}
        }

    else:
        raise ValueError(f"Unknown action: {action_name}")


def _map_relationship_status(raw_str):
    raw = raw_str.strip().upper().replace(' ', '_')
    mapping = {
        'CONTACT_FOUND': 'CONTACT_FOUND',
        'CONTACTED': 'CONTACTED',
        'REPLIED': 'REPLIED',
        'RESUME_SENT': 'RESUME_SENT',
        'RESUME_ACCEPTED': 'RESUME_ACCEPTED',
        'WILL_REFER': 'WILL_REFER',
        'WILLING_TO_REFER': 'WILL_REFER',
        'REFERRAL_GIVEN': 'REFERRAL_GIVEN',
        'INTERVIEWING': 'INTERVIEW_SCHEDULED',
        'INTERVIEW_SCHEDULED': 'INTERVIEW_SCHEDULED',
        'OFFER': 'OFFER_RECEIVED',
        'HIRED': 'HIRED'
    }
    return mapping.get(raw, 'WILL_REFER' if 'REFER' in raw else None)
