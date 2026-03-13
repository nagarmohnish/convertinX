import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String, unique=True, nullable=False)
    key_prefix = Column(String, nullable=False)  # "cvx_abc1..." for display
    name = Column(String, nullable=False)
    scopes = Column(Text, default='["tools"]')  # JSON array
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    jobs = relationship("Job", back_populates="project")


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("idx_jobs_user_id", "user_id"),
        Index("idx_jobs_status", "status"),
        Index("idx_jobs_created_at", "created_at"),
    )

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    tool = Column(String, nullable=False)  # ToolType value
    status = Column(String, nullable=False, default="queued")
    progress = Column(Float, default=0.0)
    current_step = Column(String, default="")
    input_meta = Column(Text, nullable=False)  # JSON
    output_meta = Column(Text, nullable=True)  # JSON, set on completion
    error_message = Column(Text, nullable=True)
    input_file_path = Column(String, nullable=True)
    output_dir = Column(String, nullable=True)
    source = Column(String, default="web")  # "web" | "api"
    api_key_id = Column(String, ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="jobs")
    project = relationship("Project", back_populates="jobs")


class DistributionTarget(Base):
    __tablename__ = "distribution_targets"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String, nullable=False)  # youtube, tiktok, podcast, webhook
    name = Column(String, nullable=False)
    credentials = Column(Text, nullable=False)  # Encrypted JSON
    config = Column(Text, nullable=True)  # JSON
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DistributionJob(Base):
    __tablename__ = "distribution_jobs"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, ForeignKey("distribution_targets.id", ondelete="CASCADE"), nullable=False)
    language = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    platform_url = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)


class UsageStats(Base):
    __tablename__ = "usage_stats"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    period = Column(String, nullable=False)  # "2026-03"
    tool = Column(String, nullable=False)
    job_count = Column(Integer, default=0)
    total_duration_seconds = Column(Float, default=0)
    total_file_bytes = Column(Integer, default=0)
