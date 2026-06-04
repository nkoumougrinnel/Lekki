"""Schémas de réponse du module Analytics."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OverviewResponse(BaseModel):
    documents: int
    workspaces: int
    users: int
    questions: int
    never_viewed_pages: int


class TopPage(BaseModel):
    id: str
    title: str
    category: str
    workspace_id: Optional[str] = None
    view_count: int
    last_viewed_at: Optional[datetime] = None


class TopUser(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    question_count: int


class TopQuestion(BaseModel):
    question: str
    count: int
    avg_confidence: Optional[float] = None


class FailedQuestion(BaseModel):
    question: str
    confidence: Optional[float] = None
    provider: Optional[str] = None
    had_results: bool
    created_at: Optional[datetime] = None


class MissingTopic(BaseModel):
    topic: str
    occurrences: int
    sample_question: str


class QuestionsPerDay(BaseModel):
    date: str
    count: int


class RecentError(BaseModel):
    question: str
    confidence: Optional[float] = None
    provider: Optional[str] = None
    reason: str
    created_at: Optional[datetime] = None


class SuperAdminDashboard(BaseModel):
    total_workspaces: int
    total_users: int
    active_users: int
    total_documents: int
    total_queries: int
    disk_usage_bytes: int
    providers: dict[str, int]
    recent_errors: list[RecentError]
