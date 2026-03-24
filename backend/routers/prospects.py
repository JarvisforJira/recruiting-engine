from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Optional
from db.mongodb import get_db
from models.prospect import Prospect, ProspectCreate, ProspectUpdate
from services import ai_service

router = APIRouter(prefix="/prospects", tags=["prospects"])


def _serialize(doc) -> dict:
    doc = dict(doc)
    doc["id"] = doc.get("_id", doc.get("id", ""))
    doc.pop("_id", None)
    return doc


@router.get("/", response_model=list[Prospect])
async def list_prospects(
    role_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
):
    db = get_db()
    query: dict = {}
    if role_id:
        query["role_id"] = role_id
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority

    prospects = []
    async for doc in db.prospects.find(query).sort("score", -1):
        role = db.roles.find_one({"_id": doc.get("role_id")})
        doc["role_title"] = role["title"] if role else None
        prospects.append(_serialize(doc))
    return prospects


@router.post("/", response_model=Prospect)
async def create_prospect(data: ProspectCreate):
    db = get_db()
    role_doc = db.roles.find_one({"_id": data.role_id})
    if not role_doc:
        raise HTTPException(404, "Role not found")

    now = datetime.now(timezone.utc).isoformat()
    doc = {**data.model_dump(), "status": "new", "created_at": now, "updated_at": now}
    result = db.prospects.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["role_title"] = role_doc["title"]
    return _serialize(doc)


@router.get("/{prospect_id}", response_model=Prospect)
async def get_prospect(prospect_id: str):
    db = get_db()
    doc = db.prospects.find_one({"_id": prospect_id})
    if not doc:
        raise HTTPException(404, "Prospect not found")
    role = db.roles.find_one({"_id": doc.get("role_id")})
    doc["role_title"] = role["title"] if role else None
    return _serialize(doc)


@router.patch("/{prospect_id}", response_model=Prospect)
async def update_prospect(prospect_id: str, data: ProspectUpdate):
    db = get_db()
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = db.prospects.find_one_and_update({"_id": prospect_id}, {"$set": updates})
    if not result:
        raise HTTPException(404, "Prospect not found")
    role = db.roles.find_one({"_id": result.get("role_id")})
    result["role_title"] = role["title"] if role else None
    return _serialize(result)


@router.post("/{prospect_id}/score", response_model=Prospect)
async def score_prospect(prospect_id: str):
    db = get_db()
    doc = db.prospects.find_one({"_id": prospect_id})
    if not doc:
        raise HTTPException(404, "Prospect not found")

    role_doc = db.roles.find_one({"_id": doc.get("role_id")})
    if not role_doc:
        raise HTTPException(404, "Role not found")

    plan_doc = db.targeting_plans.find_one({"role_id": doc.get("role_id")})
    targeting_plan = plan_doc if plan_doc else {}

    role = {**role_doc, "id": role_doc.get("_id", "")}
    ai_result = ai_service.score_prospect(doc["raw_profile"], role, targeting_plan)

    updates = {
        "score": ai_result.get("score"),
        "priority": ai_result.get("priority"),
        "score_reasoning": ai_result.get("score_reasoning"),
        "outreach_angle": ai_result.get("outreach_angle"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if not doc.get("name") and ai_result.get("name") and ai_result["name"] != "Unknown":
        updates["name"] = ai_result["name"]
    if not doc.get("current_title") and ai_result.get("current_title"):
        updates["current_title"] = ai_result["current_title"]
    if not doc.get("current_company") and ai_result.get("current_company"):
        updates["current_company"] = ai_result["current_company"]

    updated = db.prospects.find_one_and_update({"_id": prospect_id}, {"$set": updates})
    role_doc2 = db.roles.find_one({"_id": updated.get("role_id")})
    updated["role_title"] = role_doc2["title"] if role_doc2 else None
    return _serialize(updated)


@router.post("/score-batch")
async def score_batch(prospect_ids: list[str]):
    results = []
    for pid in prospect_ids:
        try:
            scored = await score_prospect(pid)
            results.append({"prospect_id": pid, "status": "scored", "priority": scored.priority})
        except Exception as e:
            results.append({"prospect_id": pid, "status": "error", "error": str(e)})
    return results


@router.delete("/{prospect_id}")
async def delete_prospect(prospect_id: str):
    db = get_db()
    result = db.prospects.delete_one({"_id": prospect_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Prospect not found")
    return {"deleted": True}
