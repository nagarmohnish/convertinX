from app.models.model_manager import ModelManager
from app.pipeline.orchestrator import JobOrchestrator
from app.pipeline.progress import ProgressBroadcaster

# These are set during app lifespan startup
model_manager: ModelManager = None  # type: ignore
orchestrator: JobOrchestrator = None  # type: ignore
broadcaster: ProgressBroadcaster = None  # type: ignore


def get_model_manager() -> ModelManager:
    return model_manager


def get_orchestrator() -> JobOrchestrator:
    return orchestrator


def get_broadcaster() -> ProgressBroadcaster:
    return broadcaster
