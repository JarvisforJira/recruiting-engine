import json
import anthropic
from config import settings

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _call(system: str, user: str, max_tokens: int = 2048) -> str:
    response = get_client().messages.create(
        model="claude-opus-4-5",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def _call_json(system: str, user: str, max_tokens: int = 2048) -> dict:
    text = _call(system, user + "\n\nRespond ONLY with valid JSON, no markdown fences.", max_tokens)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ─── Targeting Plan ────────────────────────────────────────────────────────────

TARGETING_SYSTEM = """You are a senior technical recruiting strategist. 
Given a job role, produce a precise, actionable targeting plan for sourcing candidates on LinkedIn.
Think like a headhunter who knows exactly where talent lives and how to position a role compellingly."""

def generate_targeting_plan(role: dict) -> dict:
    prompt = f"""
Role: {role['title']} at {role['company']}
Description: {role['description']}
Requirements: {role['requirements']}
Compensation: {role.get('compensation', 'Not specified')}
Location: {role.get('location', 'Not specified')}
Remote Policy: {role.get('remote_policy', 'Not specified')}

Generate a targeting plan with these exact keys:
- ideal_background: string describing the ideal candidate background (2-3 sentences)
- target_titles: array of 8-12 specific job titles to target
- target_companies: array of 10-15 specific companies where ideal candidates work
- adjacent_profiles: array of 4-6 non-obvious but relevant candidate profiles
- exclusion_rules: array of 4-6 signals that indicate a candidate is NOT a fit
- outreach_angles: array of 5-7 compelling hooks/angles to use in outreach messages
- keywords: array of 15-20 LinkedIn search keywords
- search_strings: array of 6-8 LinkedIn search strings. CRITICAL RULES — violating these will break the search:
  * Maximum ONE AND per string. No exceptions.
  * No nested parentheses. A string like (A OR B) AND (C OR D) is TOO COMPLEX — pick one side.
  * No location terms in the string at all ("remote", "work from home", city names) — user handles location in LinkedIn filters
  * Each string must be under 100 characters
  * Format: "// what this finds | the search string"
  * GOOD examples (follow these patterns exactly):
    - // Title variants | "Jira Administrator" OR "Atlassian Administrator" OR "Jira Developer"
    - // Jira + scripting | "Jira Administrator" AND Groovy
    - // Jira + scripting alt | "Jira Administrator" AND ScriptRunner
    - // Atlassian consultants | "Atlassian" AND consultant
    - // Skills only | Groovy AND "Atlassian SDK"
    - // Broad developer pool | "Jira" AND JavaScript
  * BAD examples (never do this):
    - ("Jira Admin" OR "Atlassian Admin") AND (JavaScript OR Groovy) — too complex, two AND groups
    - "Jira" AND "automation" AND JavaScript — three terms chained with AND
"""
    result = _call_json(TARGETING_SYSTEM, prompt, max_tokens=3000)
    result["search_strings"] = _simplify_search_strings(result.get("search_strings", []))
    return result


def _simplify_search_strings(strings: list[str]) -> list[str]:
    """
    Post-process search strings to ensure they work in standard LinkedIn search.
    Strips overly complex strings down to their most useful core.
    """
    simplified = []
    for s in strings:
        # Split comment from query if present
        if "|" in s and s.strip().startswith("//"):
            parts = s.split("|", 1)
            comment = parts[0].strip()
            query = parts[1].strip() if len(parts) > 1 else s
        else:
            comment = None
            query = s.strip()

        # Count AND occurrences — if more than 1, trim to first two clauses
        and_parts = query.split(" AND ")
        if len(and_parts) > 2:
            query = " AND ".join(and_parts[:2])

        # Remove location terms that rarely appear on profiles
        for term in [' AND (remote OR "work from home")', ' AND remote', ' AND "work from home"',
                     ' AND location:"United States"', ' AND location:"Washington DC"']:
            query = query.replace(term, "")

        query = query.strip()
        if comment:
            simplified.append(f"{comment} | {query}")
        else:
            simplified.append(query)

    # Add a set of reliable simple fallbacks at the end
    return simplified


# ─── Prospect Scoring ──────────────────────────────────────────────────────────

SCORING_SYSTEM = """You are a recruiting analyst who scores candidate fit with precision and speed.
Evaluate each profile objectively against the role requirements and targeting plan.
Be opinionated. Separate high-signal candidates from average ones."""

def score_prospect(profile_text: str, role: dict, targeting_plan: dict) -> dict:
    prompt = f"""
Role: {role['title']} at {role['company']}
Requirements: {role['requirements']}

Targeting Plan Summary:
- Ideal Background: {targeting_plan.get('ideal_background', '')}
- Target Titles: {', '.join(targeting_plan.get('target_titles', []))}
- Exclusion Rules: {', '.join(targeting_plan.get('exclusion_rules', []))}

Candidate Profile:
{profile_text}

Score this candidate and return JSON with:
- name: candidate name if visible (or "Unknown")
- current_title: their current title
- current_company: their current company  
- score: integer 0-100
- priority: one of "high", "medium", "low", "skip"
- score_reasoning: 2-3 sentence explanation of score
- outreach_angle: the single best angle to use when reaching out to THIS specific person
- fit_signals: array of 3-5 positive signals
- risk_signals: array of 1-3 concerns or gaps (empty array if none)
"""
    return _call_json(SCORING_SYSTEM, prompt, max_tokens=1500)


# ─── Message Generation ────────────────────────────────────────────────────────

MESSAGE_SYSTEM = """You are an elite recruiting copywriter who writes outreach that actually gets responses.
Your messages are personalized, concise, human, and focused on the candidate's interests — not just the role.
Never write generic templates. Every message should feel hand-crafted."""

def generate_outreach_messages(prospect: dict, role: dict, message_type: str) -> dict:
    profile_summary = f"""
Name: {prospect.get('name', 'Unknown')}
Title: {prospect.get('current_title', 'Unknown')}
Company: {prospect.get('current_company', 'Unknown')}
Location: {prospect.get('location', '')}
Outreach Angle: {prospect.get('outreach_angle', '')}
Profile: {prospect.get('raw_profile', '')[:800]}
"""
    role_context = f"""
Role: {role['title']} at {role['company']}
Compensation: {role.get('compensation', 'Competitive')}
Location: {role.get('location', '')} | Remote: {role.get('remote_policy', '')}
"""

    type_instructions = {
        "connection_note": "Write a LinkedIn connection request note. MAX 300 characters. Personalized, curious, no hard sell.",
        "first_message": "Write the first LinkedIn message after connecting. 3-4 short paragraphs. Hook them with their angle, brief role context, clear ask.",
        "follow_up_1": "Write a 1-week follow-up. Assume no response. Shorter than the first message. Different angle. Friendly not pushy.",
        "follow_up_2": "Write a 2-week final follow-up. Very brief. Leave the door open. No pressure.",
    }

    instruction = type_instructions.get(message_type, type_instructions["first_message"])

    prompt = f"""
Candidate:{profile_summary}

Role:{role_context}

Task: {instruction}

Return JSON with:
- subject: optional subject line (null for LinkedIn messages)
- body: the message text
- angle_used: which outreach angle you used
- character_count: character count of body (important for connection notes)
"""
    return _call_json(MESSAGE_SYSTEM, prompt, max_tokens=1000)


# ─── Follow-up Generation ──────────────────────────────────────────────────────

def generate_follow_up(prospect: dict, role: dict, follow_up_number: int, previous_messages: list) -> dict:
    message_type = f"follow_up_{follow_up_number}"
    return generate_outreach_messages(prospect, role, message_type)


# ─── Response Assistant ────────────────────────────────────────────────────────

RESPONSE_SYSTEM = """You are an expert recruiting coordinator helping a recruiter respond to candidate messages.
Analyze what the candidate said, identify their intent and any concerns, and draft the ideal response.
Be warm, professional, and move the process forward."""

def assist_with_response(candidate_message: str, prospect: dict, role: dict) -> dict:
    prompt = f"""
Recruiter context:
- Role: {role['title']} at {role['company']}
- Candidate: {prospect.get('name', 'Unknown')} — {prospect.get('current_title', '')} at {prospect.get('current_company', '')}

Candidate replied:
"{candidate_message}"

Return JSON with:
- summary: 1-2 sentence summary of what they said
- intent_detected: one of "interested", "needs_more_info", "scheduling", "declining", "negotiating", "asking_about_role", "other"
- key_questions_or_concerns: array of specific things they asked or raised
- suggested_response: a full draft response for the recruiter to send
- tone_notes: brief note on tone/approach to take
"""
    return _call_json(RESPONSE_SYSTEM, prompt, max_tokens=1500)


# ─── Analytics Insights ────────────────────────────────────────────────────────

ANALYTICS_SYSTEM = """You are a recruiting analytics expert. 
Analyze outreach performance data and give specific, actionable recommendations."""

def generate_analytics_insights(stats: dict) -> str:
    prompt = f"""
Outreach performance data:
{json.dumps(stats, indent=2)}

Provide 3-5 specific, actionable insights about what is working, what isn't, and what to improve.
Format as plain text with clear sections. Be direct and specific.
"""
    return _call(ANALYTICS_SYSTEM, prompt, max_tokens=1000)
