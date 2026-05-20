from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel, Field, HttpUrl


class SourceAttributionData(TypedDict, total=False):
    source_id: str
    source_name: str
    provider: str
    url: Optional[HttpUrl]
    snippet: Optional[str]
    confidence: Optional[float]
    extracted_at: Optional[datetime]


class SourceAttribution(BaseModel):
    source_id: str
    source_name: str
    provider: str
    url: Optional[HttpUrl] = None
    snippet: Optional[str] = None
    confidence: Optional[float] = None
    extracted_at: Optional[datetime] = None
    current_stage: Optional[str] = None
    execution_id: Optional[str] = None


class ProvenanceEntry(BaseModel):
    model_name: str
    agent_stage: str
    record_id: str
    event: str
    description: Optional[str] = None
    source_attribution: List[SourceAttribution] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ModelResponse(BaseModel):
    model_name: str
    stage: str
    raw_output: str
    parsed_json: Dict[str, Any] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: float = 0.0


class ResearchOutput(BaseModel):
    model_name: str
    stage: str
    company_name: str
    parsed_output: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = 0.0
    provenance: List[ProvenanceEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: float = 0.0

    @property
    def normalized_output(self) -> Dict[str, Any]:
        return {k: v for k, v in self.parsed_output.items() if v is not None}


class ConsolidatedCompanyRecord(BaseModel):
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    founded_year: Optional[int] = None
    website: Optional[str] = None
    canonical_aliases: List[str] = Field(default_factory=list)
    employee_count: Optional[int] = None
    revenue: Optional[str] = None
    ceo_name: Optional[str] = None
    operating_countries: List[str] = Field(default_factory=list)
    competitors: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    confidence_score: Optional[float] = None
    root_provenance: List[ProvenanceEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ValidationResult(BaseModel):
    validator_name: str
    field_name: str
    passed: bool
    issue_code: Optional[str] = None
    message: Optional[str] = None
    confidence_score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    validated_at: datetime = Field(default_factory=datetime.utcnow)


class RetryState(BaseModel):
    attempts: int = 0
    max_retries: int = 3
    last_attempted_at: Optional[datetime] = None
    failure_reasons: List[str] = Field(default_factory=list)
    next_retry_at: Optional[datetime] = None


class AuditLogEntry(BaseModel):
    actor: str
    action: str
    message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GraphState(BaseModel):
    session_id: Optional[str] = None
    user_input: Optional[str] = None
    company_name: Optional[str] = None
    research_outputs: List[ResearchOutput] = Field(default_factory=list)
    consolidated_record: ConsolidatedCompanyRecord = Field(default_factory=ConsolidatedCompanyRecord)
    full_profile: Optional[Dict[str, Any]] = None
    validation_results: List[ValidationResult] = Field(default_factory=list)
    failed_fields: List[str] = Field(default_factory=list)
    retry_count: int = 0
    retry_state: RetryState = Field(default_factory=RetryState)
    audit_logs: List[AuditLogEntry] = Field(default_factory=list)
    execution_metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamps: Dict[str, Any] = Field(default_factory=dict)
    model_responses: List[ModelResponse] = Field(default_factory=list)
    output_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    provenance: List[ProvenanceEntry] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda value: value.isoformat()}
