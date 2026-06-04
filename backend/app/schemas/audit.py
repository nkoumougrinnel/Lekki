"""Schémas Pydantic — Audit de connaissance."""

from datetime import datetime

from pydantic import BaseModel


class StalePage(BaseModel):
    id: str
    page: str
    category: str | None = None
    workspace_id: str | None = None
    staleness_score: int
    view_count: int = 0
    last_viewed: str | None = None
    updated_at: datetime | None = None
    never_viewed: bool = False


class UnansweredGroup(BaseModel):
    topic: str
    sample_question: str
    occurrences: int
    avg_score: float | None = None
    last_occurrence: datetime | None = None


class UnindexedPage(BaseModel):
    id: str
    page: str
    category: str | None = None
    workspace_id: str | None = None
    reason: str
    created_at: datetime | None = None


class UnusedPage(BaseModel):
    id: str
    page: str
    category: str | None = None
    workspace_id: str | None = None
    workspace: str | None = None
    created_at: datetime | None = None


class FlaggedPage(BaseModel):
    id: str
    page: str
    category: str | None = None
    workspace_id: str | None = None
    flag_count: int
    flag_types: dict[str, int]
    last_flagged_at: datetime | None = None


class MissingKnowledge(BaseModel):
    topic: str
    requests: int
    priority: str
    sample_question: str


class HealthDetails(BaseModel):
    stale_pages: int
    unanswered_questions: int
    unindexed_pages: int
    flagged_pages: int


class HealthPenalties(BaseModel):
    stale_pages: float
    unanswered_questions: float
    unindexed_pages: float
    flagged_pages: float


class HealthScore(BaseModel):
    score: int
    details: HealthDetails
    penalties: HealthPenalties


class FlagRequest(BaseModel):
    flag_type: str


class FlagResponse(BaseModel):
    id: str
    page_id: str
    flag_type: str
    flagged_by: str | None = None
    created_at: datetime | None = None
