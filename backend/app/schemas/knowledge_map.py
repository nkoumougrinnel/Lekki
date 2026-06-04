"""Schémas de la carte des connaissances (format compatible React Flow)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class MapNode(BaseModel):
    id: str
    type: str = "default"
    position: dict[str, float]
    data: dict[str, Any]
    style: dict[str, Any] | None = None


class MapEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "default"
    animated: bool = False
    label: str | None = None
    data: dict[str, Any] | None = None
    style: dict[str, Any] | None = None


class MapCluster(BaseModel):
    id: str
    label: str
    color: str
    count: int
    page_ids: list[str]


class KnowledgeMapResponse(BaseModel):
    nodes: list[MapNode]
    edges: list[MapEdge]
    clusters: list[MapCluster]
