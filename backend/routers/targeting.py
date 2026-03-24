from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from db.mongodb import get_db
from models.targeting_plan import TargetingPlan
from services import ai_service

router = APIRouter(prefix="/targeting", tags=["targeting"])


def _serialize(doc) -> dict:
    doc = dict(doc)
    doc["id"] = doc.get("_id", doc.get("id", ""))
    doc.pop("_id", None)
    return doc


@router.post("/{role_id}/generate", response_model=TargetingPlan)
async def generate_targeting_plan(role_id: str):
    db = get_db()
    role_doc = db.roles.find_one({"_id": role_id})
    if not role_doc:
        raise HTTPException(404, "Role not found")

    role = {**role_doc, "id": role_doc.get("_id", "")}
    plan_data = ai_service.generate_targeting_plan(role)

    now = datetime.now(timezone.utc).isoformat()
    doc = {"role_id": role_id, **plan_data, "created_at": now, "updated_at": now}

    db.targeting_plans.find_one_and_delete({"role_id": role_id})
    result = db.targeting_plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("/{role_id}", response_model=TargetingPlan)
async def get_targeting_plan(role_id: str):
    db = get_db()
    doc = db.targeting_plans.find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(404, "No targeting plan found. Generate one first.")
    return _serialize(doc)
