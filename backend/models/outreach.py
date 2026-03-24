from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    connection_note = "connection_note"
    first_message = "first_message"
    follow_up_1 = "follow_up_1"
    follow_up_2 = "follow_up_2"
    response_draft = "response_draft"


class OutreachMessage(BaseModel):
    id: str
    prospect_id: str
    role_id: str
    message_type: MessageType
    subject: Optional[str] = None
    body: str
    angle_used: Optional[str] = None
    sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime


class OutreachLog(BaseModel):
    id: str
    prospect_id: str
    role_id: str
    message_type: MessageType
    message_body: str
    sent_at: datetime
    response_received: bool = False
    response_at: Optional[datetime] = None
    response_summary: Optional[str] = None


class DailyQueueItem(BaseModel):
    prospect: dict
    message: OutreachMessage
    priority_rank: int
    reason: str


class ResponseAssist(BaseModel):
    prospect_id: str
    candidate_message: str
    summary: str
    intent_detected: str
    suggested_response: str
    tone_notes: str
    created_at: Union[datetime, str]
