"""
Podcast RSS feed distribution connector.
Generates/updates an RSS feed for podcast distribution.
"""
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from app.distribution.base import DistributionConnector, PublishResult
from app.config import settings


class PodcastConnector(DistributionConnector):
    platform = "podcast"

    async def publish(
        self,
        file_path: str,
        title: str,
        description: str,
        language: str,
        config: dict,
    ) -> PublishResult:
        """Add an episode to the user's podcast RSS feed."""
        try:
            feed_dir = settings.output_dir / "feeds"
            feed_dir.mkdir(parents=True, exist_ok=True)

            user_id = config.get("user_id", "default")
            feed_path = feed_dir / f"podcast_{user_id}.xml"

            # Load existing or create new feed
            if feed_path.exists():
                tree = ET.parse(str(feed_path))
                channel = tree.find(".//channel")
            else:
                rss = ET.Element("rss", version="2.0")
                rss.set("xmlns:itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd")
                channel = ET.SubElement(rss, "channel")
                ET.SubElement(channel, "title").text = config.get("podcast_title", "ConvertinX Podcast")
                ET.SubElement(channel, "description").text = config.get("podcast_description", "Auto-translated content")
                ET.SubElement(channel, "language").text = language
                ET.SubElement(channel, "link").text = config.get("website", "")
                tree = ET.ElementTree(rss)

            # Add new episode
            item = ET.SubElement(channel, "item")
            ET.SubElement(item, "title").text = title
            ET.SubElement(item, "description").text = description

            # File URL (would need to be a public URL in production)
            file_url = config.get("base_url", "") + "/" + Path(file_path).name
            enclosure = ET.SubElement(item, "enclosure")
            enclosure.set("url", file_url)
            enclosure.set("type", "audio/mpeg")
            enclosure.set("length", str(Path(file_path).stat().st_size))

            ET.SubElement(item, "pubDate").text = datetime.utcnow().strftime(
                "%a, %d %b %Y %H:%M:%S +0000"
            )
            ET.SubElement(item, "guid").text = file_url

            # Save feed
            tree.write(str(feed_path), encoding="unicode", xml_declaration=True)

            feed_url = f"/outputs/feeds/podcast_{user_id}.xml"

            return PublishResult(
                success=True,
                platform_url=feed_url,
                metadata={"feed_path": str(feed_path), "episode_title": title},
            )

        except Exception as e:
            return PublishResult(success=False, error=str(e))

    async def validate_credentials(self, credentials: dict) -> bool:
        # Podcast RSS doesn't need credentials
        return True
