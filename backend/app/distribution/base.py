"""
Abstract base class for distribution connectors.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PublishResult:
    success: bool
    platform_url: str | None = None
    error: str | None = None
    metadata: dict | None = None


class DistributionConnector(ABC):
    """Base class for all distribution platform connectors."""

    platform: str = "unknown"

    @abstractmethod
    async def publish(
        self,
        file_path: str,
        title: str,
        description: str,
        language: str,
        config: dict,
    ) -> PublishResult:
        """Publish content to the platform."""
        ...

    @abstractmethod
    async def validate_credentials(self, credentials: dict) -> bool:
        """Check if stored credentials are still valid."""
        ...
