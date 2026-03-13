"""
Dashboard endpoints: job history, usage stats.
Requires authentication.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.auth.dependencies import require_auth
from app.db.models import User, Job
from app.db.session import get_db

router = APIRouter()


@router.get("/dashboard/jobs")
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    tool: str | None = None,
    status: str | None = None,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's job history, paginated."""
    query = select(Job).where(Job.user_id == user.id)

    if tool:
        query = query.where(Job.tool == tool)
    if status:
        query = query.where(Job.status == status)

    query = query.order_by(desc(Job.created_at))

    # Count total
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return {
        "jobs": [
            {
                "id": j.id,
                "tool": j.tool,
                "status": j.status,
                "current_step": j.current_step,
                "progress": j.progress,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "error_message": j.error_message,
            }
            for j in jobs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/dashboard/stats")
async def usage_stats(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get usage statistics for the current user."""
    # Total jobs
    total_q = select(func.count()).where(Job.user_id == user.id)
    total = (await db.execute(total_q)).scalar() or 0

    # Jobs by status
    status_q = (
        select(Job.status, func.count())
        .where(Job.user_id == user.id)
        .group_by(Job.status)
    )
    status_result = await db.execute(status_q)
    by_status = {row[0]: row[1] for row in status_result.all()}

    # Jobs by tool
    tool_q = (
        select(Job.tool, func.count())
        .where(Job.user_id == user.id)
        .group_by(Job.tool)
    )
    tool_result = await db.execute(tool_q)
    by_tool = {row[0]: row[1] for row in tool_result.all()}

    return {
        "total_jobs": total,
        "by_status": by_status,
        "by_tool": by_tool,
    }
