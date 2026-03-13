from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.db.engine import get_engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db():
    """FastAPI dependency that yields an async DB session."""
    factory = get_session_factory()
    async with factory() as session:
        yield session
