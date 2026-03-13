from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from app.db.models import Base


_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        from app.config import settings
        _engine = create_async_engine(settings.database_url, echo=False)
    return _engine


async def create_tables():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")


async def dispose_engine():
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None
