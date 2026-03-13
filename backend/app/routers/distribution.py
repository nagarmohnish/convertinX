"""
Distribution endpoints: connect platforms, publish content, manage targets.
Requires authentication.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import require_auth
from app.db.models import User, DistributionTarget, DistributionJob, Job
from app.db.session import get_db
from app.distribution.base import DistributionConnector
from app.distribution.youtube import YouTubeConnector
from app.distribution.podcast import PodcastConnector
from app.distribution.webhook import WebhookConnector

router = APIRouter()

CONNECTORS: dict[str, type[DistributionConnector]] = {
    "youtube": YouTubeConnector,
    "podcast": PodcastConnector,
    "webhook": WebhookConnector,
}

PLATFORM_INFO = {
    "youtube": {"name": "YouTube", "needs_oauth": True, "description": "Upload videos to YouTube"},
    "podcast": {"name": "Podcast RSS", "needs_oauth": False, "description": "Generate podcast RSS feed"},
    "webhook": {"name": "Webhook", "needs_oauth": False, "description": "POST to custom webhook URL"},
}


@router.get("/distribution/platforms")
async def list_platforms(
    user: User = Depends(require_auth),
):
    """List available distribution platforms."""
    return {"platforms": PLATFORM_INFO}


@router.post("/distribution/targets")
async def create_target(
    platform: str = Body(...),
    name: str = Body("Default"),
    config: dict = Body({}),
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Connect a distribution target (platform)."""
    if platform not in CONNECTORS:
        raise HTTPException(400, f"Unknown platform: {platform}")

    target = DistributionTarget(
        user_id=user.id,
        platform=platform,
        name=name,
        credentials=json.dumps(config.get("credentials", {})),
        config=json.dumps({k: v for k, v in config.items() if k != "credentials"}),
        is_active=True,
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    return {
        "id": target.id,
        "platform": platform,
        "name": name,
        "is_active": True,
    }


@router.get("/distribution/targets")
async def list_targets(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's connected distribution targets."""
    result = await db.execute(
        select(DistributionTarget)
        .where(DistributionTarget.user_id == user.id)
        .order_by(DistributionTarget.created_at.desc())
    )
    targets = result.scalars().all()

    return {
        "targets": [
            {
                "id": t.id,
                "platform": t.platform,
                "name": t.name,
                "is_active": t.is_active,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in targets
        ]
    }


@router.delete("/distribution/targets/{target_id}")
async def delete_target(
    target_id: str,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a distribution target."""
    result = await db.execute(
        select(DistributionTarget)
        .where(DistributionTarget.id == target_id, DistributionTarget.user_id == user.id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Target not found")

    target.is_active = False
    await db.commit()

    return {"status": "disconnected"}


@router.post("/distribution/publish")
async def publish_content(
    target_id: str = Body(...),
    job_id: str = Body(...),
    title: str = Body(...),
    description: str = Body(""),
    language: str = Body("en"),
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Publish job output to a distribution target."""
    # Get target
    target_result = await db.execute(
        select(DistributionTarget)
        .where(DistributionTarget.id == target_id, DistributionTarget.user_id == user.id)
    )
    target = target_result.scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(404, "Target not found or inactive")

    # Get job
    job_result = await db.execute(
        select(Job).where(Job.id == job_id)
    )
    job = job_result.scalar_one_or_none()
    if not job or job.status != "completed":
        raise HTTPException(400, "Job not found or not completed")

    # Get output file path from job results
    output_meta = json.loads(job.output_meta) if job.output_meta else {}
    # Find the first file path in the output
    file_path = None
    for key, value in output_meta.items():
        if isinstance(value, str) and value.startswith("/outputs/"):
            from app.config import settings
            file_path = str(settings.output_dir / value.replace("/outputs/", ""))
            break

    if not file_path:
        raise HTTPException(400, "No output file found for this job")

    # Create distribution job record
    dist_job = DistributionJob(
        job_id=job_id,
        target_id=target_id,
        language=language,
        status="publishing",
    )
    db.add(dist_job)
    await db.commit()
    await db.refresh(dist_job)

    # Publish using connector
    connector_cls = CONNECTORS.get(target.platform)
    if not connector_cls:
        raise HTTPException(400, f"No connector for platform: {target.platform}")

    connector = connector_cls()
    config = json.loads(target.config) if target.config else {}
    credentials = json.loads(target.credentials) if target.credentials else {}
    config["credentials"] = credentials
    config["user_id"] = user.id

    result = await connector.publish(
        file_path=file_path,
        title=title,
        description=description,
        language=language,
        config=config,
    )

    # Update distribution job
    dist_job.status = "published" if result.success else "failed"
    dist_job.platform_url = result.platform_url
    if result.error:
        dist_job.status = "failed"
    await db.commit()

    return {
        "id": dist_job.id,
        "status": dist_job.status,
        "platform_url": result.platform_url,
        "error": result.error,
    }


@router.get("/distribution/jobs")
async def list_distribution_jobs(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's distribution job history."""
    result = await db.execute(
        select(DistributionJob)
        .join(DistributionTarget, DistributionJob.target_id == DistributionTarget.id)
        .where(DistributionTarget.user_id == user.id)
        .order_by(DistributionJob.created_at.desc())
        .limit(50)
    )
    jobs = result.scalars().all()

    return {
        "distribution_jobs": [
            {
                "id": j.id,
                "job_id": j.job_id,
                "target_id": j.target_id,
                "language": j.language,
                "status": j.status,
                "platform_url": j.platform_url,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ]
    }
