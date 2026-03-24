from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TargetingPlan(BaseModel):
    id: str
    role_id: str
    ideal_background: str
    target_titles: List[str]
    target_companies: List[str]
    adjacent_profiles: List[str]
    exclusion_rules: List[str]
    outreach_angles: List[str]
    keywords: List[str]
    search_strings: List[str]
    created_at: datetime
    updated_at: datetime
