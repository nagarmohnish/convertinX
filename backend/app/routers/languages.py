from fastapi import APIRouter
from app.utils.language_map import get_language_list

router = APIRouter()


@router.get("/languages")
async def list_languages():
    """Return the list of supported languages."""
    return {"languages": get_language_list()}
