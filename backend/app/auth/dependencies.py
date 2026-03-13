import hashlib
from datetime import datetime

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, ApiKey
from app.auth.jwt import decode_token


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Extract user from JWT Bearer token or API key.
    Returns None if no auth header present (anonymous access).
    """
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
        return result.scalar_one_or_none()

    if auth_header.startswith("ApiKey "):
        key = auth_header[7:]
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        result = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            return None
        # Update last_used_at
        api_key.last_used_at = datetime.utcnow()
        await db.commit()
        # Load the user
        result = await db.execute(select(User).where(User.id == api_key.user_id, User.is_active == True))
        return result.scalar_one_or_none()

    return None


async def require_auth(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Strict auth — raises 401 if not authenticated."""
    if user is None:
        raise HTTPException(401, "Authentication required")
    return user
