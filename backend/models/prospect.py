from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProspectStatus(str, Enum):
    new = "new"
    queued = "queued"
    contacted = "contacted"
    replied = "replied"
    in_conversation = "in_conversation"
    declined = "declined"
    paused = "paused"
    converted = "converted"
    not_qualified = "not_qualified"


class PriorityLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"
    skip = "skip"


class ProspectCreate(BaseModel):
    role_id: str
    raw_profile: str
    name: Optional[str] = None
    linkedin_url: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None


class ProspectUpdate(BaseModel):
    name: Optional[str] = None
    linkedin_url: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[ProspectStatus] = None
    notes: Optional[str] = None


class Prospect(BaseModel):
    id: str
    role_id: str
    role_title: Optional[str] = None
    raw_profile: str
    name: Optional[str] = None
    linkedin_url: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None
    status: ProspectStatus = ProspectStatus.new
    priority: Optional[PriorityLevel] = None
    score: Optional[int] = None
    score_reasoning: Optional[str] = None
    outreach_angle: Optional[str] = None
    notes: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    reply_received_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
