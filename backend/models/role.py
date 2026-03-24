from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RoleStatus(str, Enum):
    active = "active"
    paused = "paused"
    filled = "filled"
    cancelled = "cancelled"


class RoleCreate(BaseModel):
    title: str
    company: str
    description: str
    requirements: str
    compensation: Optional[str] = None
    location: Optional[str] = None
    remote_policy: Optional[str] = None
    notes: Optional[str] = None


class RoleUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    compensation: Optional[str] = None
    location: Optional[str] = None
    remote_policy: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[RoleStatus] = None


class Role(BaseModel):
    id: str
    title: str
    company: str
    description: str
    requirements: str
    compensation: Optional[str] = None
    location: Optional[str] = None
    remote_policy: Optional[str] = None
    notes: Optional[str] = None
    status: RoleStatus = RoleStatus.active
    prospect_count: int = 0
    contacted_count: int = 0
    replied_count: int = 0
    created_at: datetime
    updated_at: datetime
