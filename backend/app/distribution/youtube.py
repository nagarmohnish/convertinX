"""
YouTube distribution connector.
Uses YouTube Data API v3 for video uploads.

Note: Full OAuth flow requires Google Cloud project setup.
This implementation provides the structure; actual OAuth credentials
must be configured in production.
"""
import json
from pathlib import Path
from app.distribution.base import DistributionConnector, PublishResult


class YouTubeConnector(DistributionConnector):
    platform = "youtube"

    async def publish(
        self,
        file_path: str,
        title: str,
        description: str,
        language: str,
        config: dict,
    ) -> PublishResult:
        """Upload video to YouTube."""
        try:
            credentials = config.get("credentials", {})
            if not credentials.get("access_token"):
                return PublishResult(
                    success=False,
                    error="YouTube not connected. Please authenticate first."
                )

            # Build upload request
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload
            from google.oauth2.credentials import Credentials

            creds = Credentials(
                token=credentials["access_token"],
                refresh_token=credentials.get("refresh_token"),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=credentials.get("client_id"),
                client_secret=credentials.get("client_secret"),
            )

            youtube = build("youtube", "v3", credentials=creds)

            body = {
                "snippet": {
                    "title": title,
                    "description": description,
                    "defaultLanguage": language,
                    "categoryId": config.get("category_id", "22"),  # People & Blogs
                },
                "status": {
                    "privacyStatus": config.get("privacy", "unlisted"),
                    "selfDeclaredMadeForKids": False,
                },
            }

            media = MediaFileUpload(
                file_path,
                mimetype="video/mp4",
                resumable=True,
            )

            request = youtube.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media,
            )

            response = request.execute()

            video_id = response["id"]
            return PublishResult(
                success=True,
                platform_url=f"https://youtu.be/{video_id}",
                metadata={"video_id": video_id, "channel_id": response.get("snippet", {}).get("channelId")},
            )

        except Exception as e:
            return PublishResult(success=False, error=str(e))

    async def validate_credentials(self, credentials: dict) -> bool:
        try:
            from google.oauth2.credentials import Credentials
            creds = Credentials(token=credentials.get("access_token"))
            return creds.valid
        except Exception:
            return False
