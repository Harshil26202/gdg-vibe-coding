from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
import redis.asyncio as aioredis
from app.config import settings

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


async def _enrich_users(db: AsyncSession, entries: list[tuple[str, float]]) -> list[dict]:
    if not entries:
        return []
    user_ids = [int(uid) for uid, _ in entries]
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in result.scalars().all()}
    out = []
    for rank, (uid, score) in enumerate(entries, 1):
        u = users.get(int(uid))
        if u:
            out.append({
                "rank": rank,
                "user_id": u.id,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "score": round(score, 1),
                "decisions_made": u.decisions_made,
            })
    return out


@router.get("/global")
async def global_leaderboard(db: AsyncSession = Depends(get_db), limit: int = 50):
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    entries = await r.zrevrange("leaderboard:global", 0, limit - 1, withscores=True)
    await r.aclose()

    if not entries:
        result = await db.execute(
            select(User).order_by(User.total_score.desc()).limit(limit)
        )
        users = result.scalars().all()
        return [
            {"rank": i + 1, "user_id": u.id, "username": u.username,
             "avatar_url": u.avatar_url, "score": round(u.total_score, 1),
             "decisions_made": u.decisions_made}
            for i, u in enumerate(users)
        ]

    return await _enrich_users(db, entries)


@router.get("/match/{match_id}")
async def match_leaderboard(match_id: int, db: AsyncSession = Depends(get_db), limit: int = 50):
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    entries = await r.zrevrange(f"leaderboard:match:{match_id}", 0, limit - 1, withscores=True)
    await r.aclose()
    return await _enrich_users(db, entries)
