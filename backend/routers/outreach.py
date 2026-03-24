from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional
from db.mongodb import get_db
from models.outreach import OutreachMessage, ResponseAssist
from services import ai_service

router = APIRouter(prefix="/outreach", tags=["outreach"])


def _serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


class GenerateMessageRequest(BaseModel):
    prospect_id: str
    message_type: str = "first_message"


class ResponseAssistRequest(BaseModel):
    prospect_id: str
    candidate_message: str


@router.post("/generate", response_model=OutreachMessage)
async def generate_message(req: GenerateMessageRequest):
    db = get_db()
    prospect_doc = await db.prospects.find_one({"_id": ObjectId(req.prospect_id)})
    if not prospect_doc:
        raise HTTPException(404, "Prospect not found")

    role_doc = await db.roles.find_one({"_id": ObjectId(prospect_doc["role_id"])})
    if not role_doc:
        raise HTTPException(404, "Role not found")

    prospect = {**prospect_doc, "id": str(prospect_doc["_id"])}
    role = {**role_doc, "id": str(role_doc["_id"])}

    result = ai_service.generate_outreach_messages(prospect, role, req.message_type)

    now = datetime.now(timezone.utc)
    doc = {
        "prospect_id": req.prospect_id,
        "role_id": prospect_doc["role_id"],
        "message_type": req.message_type,
        "subject": result.get("subject"),
        "body": result.get("body", ""),
        "angle_used": result.get("angle_used"),
        "sent": False,
        "created_at": now,
    }
    insert_result = await db.outreach_messages.insert_one(doc)
    doc["_id"] = insert_result.inserted_id
    return _serialize(doc)


@router.get("/prospect/{prospect_id}", response_model=list[OutreachMessage])
async def get_prospect_messages(prospect_id: str):
    db = get_db()
    messages = []
    async for doc in db.outreach_messages.find({"prospect_id": prospect_id}).sort("created_at", -1):
        messages.append(_serialize(doc))
    return messages


@router.post("/mark-sent/{message_id}", response_model=OutreachMessage)
async def mark_message_sent(message_id: str):
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.outreach_messages.find_one_and_update(
        {"_id": ObjectId(message_id)},
        {"$set": {"sent": True, "sent_at": now}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Message not found")

    await db.prospects.update_one(
        {"_id": ObjectId(result["prospect_id"])},
        {"$set": {"status": "contacted", "last_contacted_at": now, "updated_at": now}},
    )
    return _serialize(result)


@router.get("/daily-queue")
async def get_daily_queue(role_id: Optional[str] = None, limit: int = 20):
    db = get_db()
    query = {
        "status": {"$in": ["new", "queued"]},
        "priority": {"$in": ["high", "medium"]},
    }
    if role_id:
        query["role_id"] = role_id

    priority_order = {"high": 0, "medium": 1, "low": 2}
    queue = []

    async for prospect_doc in db.prospects.find(query).sort("score", -1).limit(limit):
        prospect_id = str(prospect_doc["_id"])
        role_doc = await db.roles.find_one({"_id": ObjectId(prospect_doc["role_id"])})

        existing_msg = await db.outreach_messages.find_one({
            "prospect_id": prospect_id,
            "message_type": "first_message",
            "sent": False,
        })

        if not existing_msg and role_doc:
            prospect = {**prospect_doc, "id": prospect_id}
            role = {**role_doc, "id": str(role_doc["_id"])}
            try:
                msg_result = ai_service.generate_outreach_messages(prospect, role, "first_message")
                now = datetime.now(timezone.utc)
                msg_doc = {
                    "prospect_id": prospect_id,
                    "role_id": prospect_doc["role_id"],
                    "message_type": "first_message",
                    "subject": msg_result.get("subject"),
                    "body": msg_result.get("body", ""),
                    "angle_used": msg_result.get("angle_used"),
                    "sent": False,
                    "created_at": now,
                }
                insert = await db.outreach_messages.insert_one(msg_doc)
                msg_doc["_id"] = insert.inserted_id
                existing_msg = msg_doc
            except Exception:
                continue

        if existing_msg:
            msg = _serialize(dict(existing_msg))
            p = _serialize(dict(prospect_doc))
            p["role_title"] = role_doc["title"] if role_doc else None
            queue.append({
                "prospect": p,
                "message": msg,
                "priority_rank": priority_order.get(prospect_doc.get("priority", "low"), 2),
                "reason": prospect_doc.get("score_reasoning", ""),
            })

    queue.sort(key=lambda x: (x["priority_rank"], -(x["prospect"].get("score") or 0)))
    return queue


@router.get("/follow-up-queue")
async def get_follow_up_queue(role_id: Optional[str] = None):
    db = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    query = {"status": "contacted", "last_contacted_at": {"$lt": cutoff}}
    if role_id:
        query["role_id"] = role_id

    results = []
    async for doc in db.prospects.find(query).sort("last_contacted_at", 1):
        p = _serialize(dict(doc))
        role = await db.roles.find_one({"_id": ObjectId(doc["role_id"])})
        p["role_title"] = role["title"] if role else None
        results.append(p)
    return results


@router.post("/generate-follow-up")
async def generate_follow_up(req: GenerateMessageRequest):
    db = get_db()
    sent_count = await db.outreach_messages.count_documents({
        "prospect_id": req.prospect_id,
        "sent": True,
    })
    follow_up_num = min(sent_count, 2) + 1
    req.message_type = f"follow_up_{follow_up_num}"
    return await generate_message(req)


@router.post("/response-assist", response_model=ResponseAssist)
async def response_assist(req: ResponseAssistRequest):
    db = get_db()
    prospect_doc = await db.prospects.find_one({"_id": ObjectId(req.prospect_id)})
    if not prospect_doc:
        raise HTTPException(404, "Prospect not found")

    role_doc = await db.roles.find_one({"_id": ObjectId(prospect_doc["role_id"])})
    if not role_doc:
        raise HTTPException(404, "Role not found")

    prospect = {**prospect_doc, "id": str(prospect_doc["_id"])}
    role = {**role_doc, "id": str(role_doc["_id"])}

    result = ai_service.assist_with_response(req.candidate_message, prospect, role)
    now = datetime.now(timezone.utc)

    await db.prospects.update_one(
        {"_id": ObjectId(req.prospect_id)},
        {"$set": {"status": "in_conversation", "reply_received_at": now}},
    )

    return ResponseAssist(
        prospect_id=req.prospect_id,
        candidate_message=req.candidate_message,
        summary=result.get("summary", ""),
        intent_detected=result.get("intent_detected", "other"),
        suggested_response=result.get("suggested_response", ""),
        tone_notes=result.get("tone_notes", ""),
        created_at=now,
    )
