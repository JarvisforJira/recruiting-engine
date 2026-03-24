from fastapi import APIRouter
from db.mongodb import get_db
from services import ai_service
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def get_overview():
    db = get_db()
    total_roles = await db.roles.count_documents({"status": "active"})
    total_prospects = await db.prospects.count_documents({})
    total_contacted = await db.prospects.count_documents(
        {"status": {"$in": ["contacted", "replied", "in_conversation", "converted"]}}
    )
    total_replied = await db.prospects.count_documents(
        {"status": {"$in": ["replied", "in_conversation", "converted"]}}
    )
    total_converted = await db.prospects.count_documents({"status": "converted"})
    total_declined = await db.prospects.count_documents({"status": "declined"})

    reply_rate = round((total_replied / total_contacted * 100), 1) if total_contacted > 0 else 0
    contact_rate = round((total_contacted / total_prospects * 100), 1) if total_prospects > 0 else 0

    return {
        "active_roles": total_roles,
        "total_prospects": total_prospects,
        "total_contacted": total_contacted,
        "total_replied": total_replied,
        "total_converted": total_converted,
        "total_declined": total_declined,
        "reply_rate": reply_rate,
        "contact_rate": contact_rate,
    }


@router.get("/by-role")
async def analytics_by_role():
    db = get_db()
    results = []
    async for role in db.roles.find({"status": "active"}):
        role_id = str(role["_id"])
        prospects = await db.prospects.count_documents({"role_id": role_id})
        contacted = await db.prospects.count_documents(
            {"role_id": role_id, "status": {"$in": ["contacted", "replied", "in_conversation", "converted"]}}
        )
        replied = await db.prospects.count_documents(
            {"role_id": role_id, "status": {"$in": ["replied", "in_conversation", "converted"]}}
        )
        results.append({
            "role_id": role_id,
            "role_title": role["title"],
            "company": role["company"],
            "prospects": prospects,
            "contacted": contacted,
            "replied": replied,
            "reply_rate": round((replied / contacted * 100), 1) if contacted > 0 else 0,
        })
    return sorted(results, key=lambda x: x["replied"], reverse=True)


@router.get("/priority-breakdown")
async def priority_breakdown():
    db = get_db()
    result = {}
    async for doc in db.prospects.aggregate([{"$group": {"_id": "$priority", "count": {"$sum": 1}}}]):
        result[doc["_id"] or "unscored"] = doc["count"]
    return result


@router.get("/status-breakdown")
async def status_breakdown():
    db = get_db()
    result = {}
    async for doc in db.prospects.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        result[doc["_id"]] = doc["count"]
    return result


@router.get("/insights")
async def get_ai_insights():
    overview = await get_overview()
    by_role = await analytics_by_role()
    status_bd = await status_breakdown()
    priority_bd = await priority_breakdown()

    stats = {
        "overview": overview,
        "by_role": by_role[:5],
        "status_breakdown": status_bd,
        "priority_breakdown": priority_bd,
    }
    insights = ai_service.generate_analytics_insights(stats)
    return {"insights": insights, "stats": stats}
