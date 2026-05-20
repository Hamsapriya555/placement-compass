"""
Validation Node
===============
Deterministic, rule-based validation suite. NOT an LLM.

Checks performed
----------------
1. Presence / null checks (required fields)
2. Data-type validation
3. Regex format checks (URL, year)
4. Completeness checks (optional fields)
5. Confidence threshold enforcement
6. Freshness / staleness check
7. Duplicate detection (process-lifetime set)
8. Business rule enforcement
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from ..graph_state.state import (
    AuditLogEntry,
    ConsolidatedCompanyRecord,
    GraphState,
    ValidationResult,
)

LOGGER = logging.getLogger(__name__)

# ── Thresholds ─────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD: float = 0.50
MAX_RECORD_AGE_HOURS: int = 48
MIN_DESCRIPTION_LENGTH: int = 20

# ── Regex patterns ─────────────────────────────────────────────────────────────
_URL_RE = re.compile(
    r"^(https?://)?"
    r"(([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,})"
    r"(/.*)?$"
)
_YEAR_RE = re.compile(r"^\d{4}$")

# Module-level duplicate tracker uses (session_id, company_id) pairs
# so re-validation within the same pipeline session is never a false positive.
_SEEN_KEYS: Set[str] = set()

# Critical validators — failures populate failed_fields and trigger retry
_CRITICAL_VALIDATORS = {
    "presence_validator",
    "dtype_validator",
    "regex_validator",
    "confidence_validator",
    "business_rule_validator",
    # NOTE: duplicate_detector is intentionally excluded from critical validators
    # so duplicate flags are advisory-only and never trigger LLM regeneration.
}


# ── Individual validators ──────────────────────────────────────────────────────

def _v_presence(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    results = []
    for field, value in {
        "company_name": record.company_name,
        "industry":     record.industry,
        "description":  record.description,
    }.items():
        ok = bool(value and str(value).strip())
        results.append(ValidationResult(
            validator_name="presence_validator",
            field_name=field,
            passed=ok,
            issue_code=None if ok else "FIELD_MISSING",
            message=None if ok else f"Required field '{field}' is missing or empty",
            confidence_score=1.0,
        ))
    return results


def _v_dtypes(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    results = []
    current_year = datetime.utcnow().year

    fy = record.founded_year
    if fy is not None:
        ok = isinstance(fy, int) and 1800 <= fy <= current_year
        results.append(ValidationResult(
            validator_name="dtype_validator",
            field_name="founded_year",
            passed=ok,
            issue_code=None if ok else "INVALID_YEAR",
            message=None if ok else f"founded_year '{fy}' must be int in [1800, {current_year}]",
        ))

    cs = record.confidence_score
    if cs is not None:
        ok = isinstance(cs, float) and 0.0 <= cs <= 1.0
        results.append(ValidationResult(
            validator_name="dtype_validator",
            field_name="confidence_score",
            passed=ok,
            issue_code=None if ok else "INVALID_CONFIDENCE",
            message=None if ok else f"confidence_score '{cs}' must be float in [0.0, 1.0]",
        ))

    return results


def _v_regex(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    results = []

    website = str(record.website) if record.website else None
    if website:
        ok = bool(_URL_RE.match(website))
        results.append(ValidationResult(
            validator_name="regex_validator",
            field_name="website",
            passed=ok,
            issue_code=None if ok else "INVALID_URL",
            message=None if ok else f"website '{website}' does not match URL pattern",
        ))

    fy = record.founded_year
    if fy is not None:
        ok = bool(_YEAR_RE.match(str(fy)))
        results.append(ValidationResult(
            validator_name="regex_validator",
            field_name="founded_year",
            passed=ok,
            issue_code=None if ok else "INVALID_YEAR_FORMAT",
            message=None if ok else f"founded_year '{fy}' must be 4-digit integer",
        ))

    return results


def _v_completeness(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    results = []
    optional = {
        "website":           record.website,
        "headquarters":      record.headquarters,
        "founded_year":      record.founded_year,
        "canonical_aliases": record.canonical_aliases,
    }
    for field, value in optional.items():
        populated = value is not None and value != [] and value != ""
        results.append(ValidationResult(
            validator_name="completeness_validator",
            field_name=field,
            passed=populated,
            issue_code=None if populated else "FIELD_INCOMPLETE",
            message=None if populated else f"Optional field '{field}' is empty",
            confidence_score=0.8,
        ))
    return results


def _v_confidence(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    cs = record.confidence_score or 0.0
    ok = cs >= CONFIDENCE_THRESHOLD
    return [ValidationResult(
        validator_name="confidence_validator",
        field_name="confidence_score",
        passed=ok,
        issue_code=None if ok else "LOW_CONFIDENCE",
        message=None if ok else f"confidence {cs:.4f} below threshold {CONFIDENCE_THRESHOLD}",
        confidence_score=cs,
    )]


def _v_freshness(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    age = datetime.utcnow() - record.created_at
    ok = age <= timedelta(hours=MAX_RECORD_AGE_HOURS)
    return [ValidationResult(
        validator_name="freshness_validator",
        field_name="created_at",
        passed=ok,
        issue_code=None if ok else "STALE_RECORD",
        message=None if ok else (
            f"Record age {age.total_seconds()/3600:.1f}h exceeds max {MAX_RECORD_AGE_HOURS}h"
        ),
    )]


def _v_duplicates(record: ConsolidatedCompanyRecord, session_id: str = "") -> List[ValidationResult]:
    """Detect duplicate records. Uses (session_id, company_id) as the key
    so re-validation within the same pipeline run is never a false positive."""
    cid = record.company_id or ""
    key = f"{session_id}:{cid}"
    is_dup = key in _SEEN_KEYS
    if not is_dup and cid:
        _SEEN_KEYS.add(key)
    return [ValidationResult(
        validator_name="duplicate_detector",
        field_name="company_id",
        passed=not is_dup,
        issue_code=None if not is_dup else "DUPLICATE_RECORD",
        message=None if not is_dup else f"Duplicate company_id in session {session_id}: {cid}",
    )]


def _v_business_rules(record: ConsolidatedCompanyRecord) -> List[ValidationResult]:
    results = []
    current_year = datetime.utcnow().year

    # Company name must contain at least one alphanumeric character
    cn = record.company_name or ""
    ok = bool(re.search(r"[a-zA-Z0-9]", cn))
    results.append(ValidationResult(
        validator_name="business_rule_validator",
        field_name="company_name",
        passed=ok,
        issue_code=None if ok else "INVALID_COMPANY_NAME",
        message=None if ok else f"company_name '{cn}' has no alphanumeric characters",
    ))

    # Founded year must not be in the future
    fy = record.founded_year
    if fy is not None:
        ok = fy <= current_year
        results.append(ValidationResult(
            validator_name="business_rule_validator",
            field_name="founded_year",
            passed=ok,
            issue_code=None if ok else "FUTURE_FOUNDED_YEAR",
            message=None if ok else f"founded_year {fy} is in the future",
        ))

    # Description minimum length
    desc = record.description or ""
    ok = len(desc.strip()) >= MIN_DESCRIPTION_LENGTH
    results.append(ValidationResult(
        validator_name="business_rule_validator",
        field_name="description",
        passed=ok,
        issue_code=None if ok else "DESCRIPTION_TOO_SHORT",
        message=None if ok else (
            f"description has {len(desc.strip())} chars; minimum {MIN_DESCRIPTION_LENGTH}"
        ),
    ))

    return results


# ── Orchestration ──────────────────────────────────────────────────────────────

_VALIDATORS_SIMPLE = [
    _v_presence,
    _v_dtypes,
    _v_regex,
    _v_completeness,
    _v_confidence,
    _v_freshness,
    _v_business_rules,
]


def _run_validators(
    record: ConsolidatedCompanyRecord,
    session_id: str = "",
) -> List[ValidationResult]:
    all_results: List[ValidationResult] = []
    for fn in _VALIDATORS_SIMPLE:
        try:
            all_results.extend(fn(record))
        except Exception:
            LOGGER.exception("Validator %s raised an unexpected error", fn.__name__)
    # Run session-scoped duplicate detector separately
    try:
        all_results.extend(_v_duplicates(record, session_id=session_id))
    except Exception:
        LOGGER.exception("Duplicate validator raised an unexpected error")
    return all_results


def _extract_failed_fields(results: List[ValidationResult]) -> List[str]:
    seen: Set[str] = set()
    failed: List[str] = []
    for r in results:
        if not r.passed and r.validator_name in _CRITICAL_VALIDATORS:
            if r.field_name not in seen:
                seen.add(r.field_name)
                failed.append(r.field_name)
    return failed


# ── LangGraph node ─────────────────────────────────────────────────────────────

async def run_validation_node(state: GraphState) -> dict:
    """LangGraph async node — deterministic validation of the consolidated record."""
    LOGGER.info("Validation starting for company=%s", state.company_name)

    record = state.consolidated_record
    if record is None:
        LOGGER.error("No consolidated_record found; cannot validate")
        audit = AuditLogEntry(
            actor="validation_node",
            action="validation_skipped",
            message="No consolidated record available",
        )
        return {"audit_logs": state.audit_logs + [audit], "updated_at": datetime.utcnow()}

    results = _run_validators(record, session_id=state.session_id or "")
    failed = _extract_failed_fields(results)

    passed_count = sum(1 for r in results if r.passed)
    failed_count = len(results) - passed_count

    LOGGER.info(
        "Validation complete: %d passed / %d failed — failed_fields=%s",
        passed_count, failed_count, failed,
    )

    audit = AuditLogEntry(
        actor="validation_node",
        action="validation_completed",
        message=f"{passed_count} checks passed, {failed_count} failed",
        metadata={
            "total_checks": len(results),
            "passed": passed_count,
            "failed": failed_count,
            "failed_fields": failed,
        },
    )

    return {
        "validation_results": results,
        "failed_fields": failed,
        "audit_logs": state.audit_logs + [audit],
        "updated_at": datetime.utcnow(),
        "metadata": {
            **state.metadata,
            "validation_stage": {
                "completed_at": datetime.utcnow().isoformat(),
                "total_checks": len(results),
                "passed": passed_count,
                "failed": failed_count,
                "failed_fields": failed,
            },
        },
    }
