from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from db.mongodb import get_db
from models.role import Role, RoleCreate, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


def _serialize(doc) -> dict:
    doc = dict(doc)
    doc["id"] = doc.get("_id", doc.get("id", ""))
    doc.pop("_id", None)
    return doc


@router.get("/", response_model=list[Role])
async def list_roles():
    db = get_db()
    roles = []
    async for doc in db.roles.find().sort("created_at", -1):
        role_id = doc.get("_id") or doc.get("id")
        doc["prospect_count"] = db.prospects.count_documents({"role_id": role_id})
        doc["contacted_count"] = db.prospects.count_documents(
            {"role_id": role_id, "status": {"$in": ["contacted", "replied", "in_conversation", "converted"]}}
        )
        doc["replied_count"] = db.prospects.count_documents(
            {"role_id": role_id, "status": {"$in": ["replied", "in_conversation", "converted"]}}
        )
        roles.append(_serialize(doc))
    return roles


@router.post("/", response_model=Role)
async def create_role(data: RoleCreate):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    doc = {**data.model_dump(), "status": "active", "created_at": now, "updated_at": now}
    result = db.roles.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["prospect_count"] = 0
    doc["contacted_count"] = 0
    doc["replied_count"] = 0
    return _serialize(doc)


@router.get("/{role_id}", response_model=Role)
async def get_role(role_id: str):
    db = get_db()
    doc = db.roles.find_one({"_id": role_id})
    if not doc:
        raise HTTPException(404, "Role not found")
    doc["prospect_count"] = db.prospects.count_documents({"role_id": role_id})
    doc["contacted_count"] = db.prospects.count_documents(
        {"role_id": role_id, "status": {"$in": ["contacted", "replied", "in_conversation", "converted"]}}
    )
    doc["replied_count"] = db.prospects.count_documents(
        {"role_id": role_id, "status": {"$in": ["replied", "in_conversation", "converted"]}}
    )
    return _serialize(doc)


@router.patch("/{role_id}", response_model=Role)
async def update_role(role_id: str, data: RoleUpdate):
    db = get_db()
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = db.roles.find_one_and_update({"_id": role_id}, {"$set": updates})
    if not result:
        raise HTTPException(404, "Role not found")
    result["prospect_count"] = db.prospects.count_documents({"role_id": role_id})
    result["contacted_count"] = db.prospects.count_documents(
        {"role_id": role_id, "status": {"$in": ["contacted", "replied", "in_conversation", "converted"]}}
    )
    result["replied_count"] = db.prospects.count_documents(
        {"role_id": role_id, "status": {"$in": ["replied", "in_conversation", "converted"]}}
    )
    return _serialize(result)


@router.delete("/{role_id}")
async def delete_role(role_id: str):
    db = get_db()
    result = db.roles.delete_one({"_id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Role not found")
    return {"deleted": True}
