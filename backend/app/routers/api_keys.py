"""
API Key management endpoints.
Requires authentication.
"""
import secrets
import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import require_auth
from app.db.models import User, ApiKey
from app.db.session import get_db

router = APIRouter()


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.post("/api-keys")
async def create_api_key(
    name: str = "Default",
    scopes: str = "all",
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key. Returns the full key only once."""
    # Generate a secure API key
    raw_key = f"cvx_{secrets.token_urlsafe(32)}"
    key_prefix = raw_key[:8]
    key_hash = _hash_key(raw_key)

    api_key = ApiKey(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=name,
        scopes=scopes,
        is_active=True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return {
        "id": api_key.id,
        "key": raw_key,  # Only returned on creation
        "key_prefix": key_prefix,
        "name": name,
        "scopes": scopes,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
    }


@router.get("/api-keys")
async def list_api_keys(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the current user."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()

    return {
        "keys": [
            {
                "id": k.id,
                "key_prefix": k.key_prefix,
                "name": k.name,
                "scopes": k.scopes,
                "is_active": k.is_active,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            }
            for k in keys
        ]
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) an API key."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.id == key_id, ApiKey.user_id == user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(404, "API key not found")

    key.is_active = False
    await db.commit()

    return {"status": "revoked", "key_prefix": key.key_prefix}
