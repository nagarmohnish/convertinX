"""
Webhook distribution connector.
POSTs content notification to a user-configured URL.
"""
import httpx
from pathlib import Path
from app.distribution.base import DistributionConnector, PublishResult


class WebhookConnector(DistributionConnector):
    platform = "webhook"

    async def publish(
        self,
        file_path: str,
        title: str,
        description: str,
        language: str,
        config: dict,
    ) -> PublishResult:
        """Send a webhook notification with file details."""
        webhook_url = config.get("webhook_url")
        if not webhook_url:
            return PublishResult(
                success=False,
                error="No webhook URL configured"
            )

        try:
            payload = {
                "event": "content.published",
                "title": title,
                "description": description,
                "language": language,
                "file_name": Path(file_path).name,
                "file_size": Path(file_path).stat().st_size,
                "download_url": config.get("download_url", ""),
            }

            headers = {"Content-Type": "application/json"}
            if config.get("webhook_secret"):
                headers["X-Webhook-Secret"] = config["webhook_secret"]

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                )

            if response.status_code >= 400:
                return PublishResult(
                    success=False,
                    error=f"Webhook returned {response.status_code}"
                )

            return PublishResult(
                success=True,
                platform_url=webhook_url,
                metadata={"status_code": response.status_code},
            )

        except Exception as e:
            return PublishResult(success=False, error=str(e))

    async def validate_credentials(self, credentials: dict) -> bool:
        return bool(credentials.get("webhook_url"))
