from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field


class ImportResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    source_type: str
    source_name: str
    status: str
    total_files: int
    processed_files: int
    error_log: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def progress(self) -> float:
        """Progression en pourcentage [0, 100]."""
        if not self.total_files:
            return 100.0 if self.status == "completed" else 0.0
        return round(100.0 * self.processed_files / self.total_files, 1)
