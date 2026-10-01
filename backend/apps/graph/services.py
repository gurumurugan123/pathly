from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship
from apps.relationships.constants import STATUS_CONFIG

def build_user_graph(user):
    companies = list(Company.objects.filter(user=user))
    people = list(Person.objects.filter(user=user).select_related('company'))
    relationships = {rel.person_id: rel for rel in Relationship.objects.filter(user=user)}

    nodes = []
    edges = []

    # 1. User Root Node ("YOU")
    nodes.append({
        "id": "user-root",
        "type": "userNode",
        "position": {"x": 0, "y": 0},
        "data": {
            "id": user.id,
            "label": "YOU",
            "name": user.username,
            "email": user.email,
        }
    })

    # Calculate people count per company
    company_person_counts = {}
    for person in people:
        if person.company_id:
            company_person_counts[person.company_id] = company_person_counts.get(person.company_id, 0) + 1

    # 2. Company Nodes & User -> Company Edges
    for company in companies:
        p_count = company_person_counts.get(company.id, 0)
        nodes.append({
            "id": f"company-{company.id}",
            "type": "companyNode",
            "position": {"x": 0, "y": 0},
            "data": {
                "id": company.id,
                "name": company.name,
                "website": company.website,
                "industry": company.industry,
                "location": company.location,
                "peopleCount": p_count,
                "logoUrl": company.logo_url,
            }
        })

        # Edge from User -> Company
        edges.append({
            "id": f"edge-user-company-{company.id}",
            "source": "user-root",
            "target": f"company-{company.id}",
            "type": "default",
            "animated": False,
            "data": {
                "type": "user-company"
            },
            "style": {
                "stroke": "#CBD5E1",
                "strokeWidth": 2.5
            }
        })

    # 3. Person Nodes & Company -> Person Edges
    stats = {
        "totalPeople": len(people),
        "resumeAccepted": 0,
        "replied": 0,
        "willRefer": 0,
        "referralGiven": 0,
        "contactFound": 0,
        "contacted": 0,
        "resumeSent": 0,
    }

    for person in people:
        rel = relationships.get(person.id)
        current_status = rel.current_status if rel else "CONTACT_FOUND"

        if current_status == "RESUME_ACCEPTED":
            stats["resumeAccepted"] += 1
        elif current_status == "REPLIED":
            stats["replied"] += 1
        elif current_status == "WILL_REFER":
            stats["willRefer"] += 1
        elif current_status == "REFERRAL_GIVEN":
            stats["referralGiven"] += 1
        elif current_status == "CONTACT_FOUND":
            stats["contactFound"] += 1
        elif current_status == "CONTACTED":
            stats["contacted"] += 1
        elif current_status == "RESUME_SENT":
            stats["resumeSent"] += 1

        nodes.append({
            "id": f"person-{person.id}",
            "type": "personNode",
            "position": {"x": 0, "y": 0},
            "data": {
                "id": person.id,
                "relationshipId": rel.id if rel else None,
                "name": person.name,
                "designation": person.designation,
                "email": person.email,
                "phone": person.phone,
                "location": person.location,
                "linkedinUrl": person.linkedin_url,
                "companyId": person.company_id,
                "companyName": person.company.name if person.company else None,
                "status": current_status,
            }
        })

        # Edge from Company -> Person (or User -> Person if no company)
        if person.company_id:
            source_id = f"company-{person.company_id}"
            edge_type_name = "company-person"
        else:
            source_id = "user-root"
            edge_type_name = "user-person"

        edges.append({
            "id": f"edge-conn-{person.id}",
            "source": source_id,
            "target": f"person-{person.id}",
            "type": "default",
            "animated": False,
            "data": {
                "status": current_status,
                "type": edge_type_name
            }
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": stats,
        "statusConfig": STATUS_CONFIG
    }
