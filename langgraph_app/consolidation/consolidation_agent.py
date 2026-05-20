"""
Consolidation Agent
===================
Merges outputs from all 3 research models into a single golden
ConsolidatedCompanyRecord using weighted scoring:

    Data Freshness   = 35 %
    Research Accuracy = 45 %
    Rule Compliance  = 20 %

Field-level conflicts are resolved via weighted voting.
Full provenance and source attribution are preserved.
"""
from __future__ import annotations

import copy
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from ..graph_state.state import (
    AuditLogEntry,
    ConsolidatedCompanyRecord,
    GraphState,
    ProvenanceEntry,
    ResearchOutput,
    SourceAttribution,
)

LOGGER = logging.getLogger(__name__)

# ── Scoring weights ────────────────────────────────────────────────────────────
WEIGHT_FRESHNESS: float = 0.35
WEIGHT_ACCURACY: float = 0.45
WEIGHT_COMPLIANCE: float = 0.20

# Canonical output fields and their LLM-response aliases
_FIELD_ALIASES: Dict[str, List[str]] = {
    "company_name":  ["company_name", "name", "company"],
    "website":       ["website", "url", "homepage", "web"],
    "industry":      ["industry", "sector", "domain", "vertical"],
    "headquarters":  ["headquarters", "hq", "location", "hq_location", "city"],
    "founded_year":  ["founded_year", "founded", "year_founded", "established"],
    "description":   ["description", "summary", "about", "overview"],
}

_CANONICAL_FIELDS = list(_FIELD_ALIASES.keys())


# ── Scoring helpers ────────────────────────────────────────────────────────────

def _freshness_score(output: ResearchOutput, now: datetime) -> float:
    """Decay linearly over 24 hours → [0.0, 1.0]."""
    age_s = max(0.0, (now - output.created_at).total_seconds())
    return max(0.0, 1.0 - age_s / 86_400.0)


def _accuracy_score(output: ResearchOutput) -> float:
    """Self-reported model confidence, clamped to [0.0, 1.0]."""
    cs = output.confidence_score
    if cs is None:
        return 0.5
    return max(0.0, min(1.0, float(cs)))


def _compliance_score(output: ResearchOutput) -> float:
    """Fraction of required canonical fields present in normalised output."""
    normalised = output.normalized_output
    present = 0
    for canonical, aliases in _FIELD_ALIASES.items():
        for alias in aliases:
            if normalised.get(alias) not in (None, "", [], {}):
                present += 1
                break
    return present / len(_CANONICAL_FIELDS)


def _composite_score(output: ResearchOutput, now: datetime) -> float:
    f = _freshness_score(output, now)
    a = _accuracy_score(output)
    c = _compliance_score(output)
    score = WEIGHT_FRESHNESS * f + WEIGHT_ACCURACY * a + WEIGHT_COMPLIANCE * c
    LOGGER.debug(
        "Model %s → freshness=%.3f accuracy=%.3f compliance=%.3f composite=%.4f",
        output.model_name, f, a, c, score,
    )
    return round(score, 4)


# ── Field extraction / conflict resolution ─────────────────────────────────────

def _extract_field(normalised: Dict[str, Any], canonical: str) -> Optional[Any]:
    for alias in _FIELD_ALIASES.get(canonical, [canonical]):
        v = normalised.get(alias)
        if v not in (None, "", [], {}):
            return v
    return None


def _resolve_conflict(candidates: List[Tuple[Any, float]]) -> Tuple[Optional[Any], float]:
    """Weighted majority vote. Returns (winner, confidence_ratio)."""
    if not candidates:
        return None, 0.0

    bucket_score: Dict[str, float] = {}
    bucket_value: Dict[str, Any] = {}
    for value, score in candidates:
        key = str(value).strip().lower()
        bucket_score[key] = bucket_score.get(key, 0.0) + score
        bucket_value[key] = value

    best = max(bucket_score, key=lambda k: bucket_score[k])
    total = sum(bucket_score.values())
    confidence = bucket_score[best] / total if total > 0 else 0.0
    return bucket_value[best], round(confidence, 4)


# ── Merge logic ────────────────────────────────────────────────────────────────

def _merge_outputs(
    outputs: List[ResearchOutput],
    scores: List[float],
) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    field_confidence: Dict[str, float] = {}

    # Collect all unique keys from all outputs
    all_keys = set()
    for output in outputs:
        all_keys.update(output.normalized_output.keys())

    for key in all_keys:
        candidates: List[Tuple[Any, float]] = []
        for output, score in zip(outputs, scores):
            v = output.normalized_output.get(key)
            if v is not None and v != "" and v != [] and v != {}:
                candidates.append((v, score))

        if candidates:
            value, conf = _resolve_conflict(candidates)
            merged[key] = value
            field_confidence[key] = conf

    merged["_field_confidence"] = field_confidence
    return merged


def _build_record(
    merged: Dict[str, Any],
    company_name: str,
    provenance: List[ProvenanceEntry],
    scores: List[float],
) -> ConsolidatedCompanyRecord:
    overall_conf = round(sum(scores) / len(scores) if scores else 0.0, 4)

    founded_year: Optional[int] = None
    raw_fy = merged.get("founded_year")
    if raw_fy is not None:
        try:
            founded_year = int(str(raw_fy).strip()[:4])
        except (ValueError, TypeError):
            pass

    website_raw = merged.get("website")

    return ConsolidatedCompanyRecord(
        company_id=str(uuid.uuid4()),
        company_name=merged.get("company_name") or company_name,
        website=website_raw or None,
        industry=merged.get("industry"),
        headquarters=merged.get("headquarters"),
        founded_year=founded_year,
        description=merged.get("description"),
        confidence_score=overall_conf,
        root_provenance=provenance,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


_STRICT_PROFILE_TEMPLATE: Dict[str, Any] = {
    "id": None,
    "company_id": None,
    "Company Name": "",
    "Short Name": "",
    "Logo": "",
    "Category": "",
    "Year of Incorporation": "",
    "Overview of the Company": "",
    "Nature of Company": "",
    "Company Headquarters": "",
    "Countries Operating In": [],
    "Number of Offices (beyond HQ)": "",
    "Office Locations": [],
    "Employee Size": "",
    "Hiring Velocity": "",
    "Employee Turnover": "",
    "Average Retention Tenure": "",
    "Pain Points Being Addressed": [],
    "Focus Sectors / Industries": [],
    "Services / Offerings / Products": [],
    "Top Customers by Client Segments": [],
    "Core Value Proposition": "",
    "Vision": "",
    "Mission": "",
    "Values": [],
    "Unique Differentiators": [],
    "Competitive Advantages": [],
    "Weaknesses / Gaps in Offering": [],
    "Key Challenges and Unmet Needs": [],
    "Key Competitors": [],
    "Technology Partners": [],
    "Interesting Facts": [],
    "Recent News": [],
    "Website URL": "",
    "Quality of Website": "",
    "Website Rating": 0,
    "Website Traffic Rank": "",
    "Social Media Followers – Combined": "",
    "Glassdoor Rating": 0,
    "Indeed Rating": 0,
    "Google Reviews Rating": 0,
    "LinkedIn Profile URL": "",
    "Twitter (X) Handle": "",
    "Facebook Page URL": "",
    "Instagram Page URL": "",
    "CEO Name": "",
    "CEO LinkedIn URL": "",
    "Key Business Leaders": [],
    "Warm Introduction Pathways": [],
    "Decision Maker Accessibility": "",
    "Company Contact Email": "",
    "Company Phone Number": "",
    "Primary Contact Person's Name": "",
    "Primary Contact Person's Title": "",
    "Primary Contact Person's Email": "",
    "Primary Contact Person's Phone Number": "",
    "Awards & Recognitions": [],
    "Brand Sentiment Score": 0,
    "Event Participation": [],
    "Regulatory & Compliance Status": "",
    "Legal Issues / Controversies": [],
    "Annual Revenues": "",
    "Annual Profits": "",
    "Revenue Mix": {},
    "Company Valuation": "",
    "Year-over-Year Growth Rate": "",
    "Profitability Status": "",
    "Market Share (%)": 0,
    "Key Investors / Backers": [],
    "Recent Funding Rounds": [],
    "Total Capital Raised": "",
    "ESG Practices or Ratings": "",
    "Sales Motion": "",
    "Customer Acquisition Cost (CAC)": "",
    "Customer Lifetime Value (CLV)": "",
    "CAC:LTV Ratio": "",
    "Churn Rate": "",
    "Net Promoter Score (NPS)": 0,
    "Customer Concentration Risk": "",
    "Burn Rate": "",
    "Runway": "",
    "Burn Multiplier": "",
    "Intellectual Property": [],
    "R&D Investment": "",
    "AI/ML Adoption Level": "",
    "Tech Stack/Tools Used": [],
    "Cybersecurity Posture": "",
    "Supply Chain Dependencies": [],
    "Geopolitical Risks": [],
    "Macro Risks": [],
    "Diversity Metrics": "",
    "Remote Work Policy": "",
    "Training/Development Spend": "",
    "Partnership Ecosystem": [],
    "Exit Strategy/History": "",
    "Carbon Footprint/Environmental Impact": "",
    "Ethical Sourcing Practices": "",
    "Benchmark vs. Peers": "",
    "Future Projections": "",
    "Strategic Priorities": [],
    "Industry Associations / Memberships": [],
    "Case Studies / Public Success Stories": [],
    "Go-to-Market Strategy": "",
    "Innovation Roadmap": [],
    "Product Pipeline": [],
    "Board of Directors / Advisors": [],
    "Company Introduction / Marketing videos": [],
    "Customer testimonial": [],
    "Industry Benchmark Technology Adoption Rating": "",
    "Total Addressable Market (TAM)": "",
    "Serviceable Addressable Market (SAM)": "",
    "Serviceable Obtainable Market (SOM)": "",
    "Work culture": "",
    "Manager quality": "",
    "Psychological safety": "",
    "Feedback culture": "",
    "Diversity & inclusion": "",
    "Ethical standards": "",
    "Typical working hours": "",
    "Overtime expectations": "",
    "Weekend work": "",
    "Remote / hybrid / on-site flexibility": "",
    "Leave policy": "",
    "Burnout risk": "",
    "Central vs peripheral location": "",
    "Public transport access": "",
    "Cab availability and company cab policy": "",
    "Commute time from airport": "",
    "Office zone type": "",
    "Area safety": "",
    "Company safety policies": "",
    "Office infrastructure safety": "",
    "Emergency response preparedness": "",
    "Health support": "",
    "Onboarding and training quality": "",
    "Learning culture": "",
    "Exposure quality": "",
    "Mentorship availability": "",
    "Internal mobility": "",
    "Promotion clarity": "",
    "Tools and technology access": "",
    "Role clarity": "",
    "Early ownership": "",
    "Work impact": "",
    "Execution vs thinking balance": "",
    "Automation level": "",
    "Cross-functional exposure": "",
    "Company maturity": "",
    "Brand value": "",
    "Client quality": "",
    "Layoff history": "",
    "Fixed vs variable pay": "",
    "Bonus predictability": "",
    "ESOPs and long-term incentives": "",
    "Family health insurance": "",
    "Relocation support": "",
    "Lifestyle and wellness benefits": "",
    "Exit opportunities": "",
    "Skill relevance": "",
    "External recognition": "",
    "Network strength": "",
    "Global exposure": "",
    "Mission clarity": "",
    "Sustainability and CSR": "",
    "Crisis behavior": ""
}

def _build_strict_profile(merged: Dict[str, Any]) -> Dict[str, Any]:
    profile = copy.deepcopy(_STRICT_PROFILE_TEMPLATE)
    for key in profile:
        if key not in merged:
            continue
        value = merged[key]
        if value is None:
            continue
        if isinstance(profile[key], list) and not isinstance(value, list):
            continue
        if isinstance(profile[key], dict) and not isinstance(value, dict):
            continue
        if isinstance(profile[key], int) and isinstance(value, bool):
            continue
        if isinstance(profile[key], int) and isinstance(value, (int, float)):
            profile[key] = value
            continue
        profile[key] = value
    return profile


# ── LangGraph node ─────────────────────────────────────────────────────────────

async def run_consolidation_agent(state: GraphState) -> dict:
    """LangGraph async node — consolidate multi-model research into a golden record."""
    LOGGER.info(
        "Consolidation starting: company=%s outputs=%d",
        state.company_name, len(state.research_outputs),
    )

    outputs = state.research_outputs
    if not outputs:
        LOGGER.warning("No research outputs; skipping consolidation")
        audit = AuditLogEntry(
            actor="consolidation_agent",
            action="consolidation_skipped",
            message="No research outputs available",
        )
        return {"audit_logs": state.audit_logs + [audit], "updated_at": datetime.utcnow()}

    now = datetime.utcnow()
    scores = [_composite_score(o, now) for o in outputs]
    LOGGER.info("Scores: %s", {o.model_name: s for o, s in zip(outputs, scores)})

    merged = _merge_outputs(outputs, scores)

    # Collect provenance from all models
    all_provenance: List[ProvenanceEntry] = []
    for o in outputs:
        all_provenance.extend(o.provenance)

    consolidation_entry = ProvenanceEntry(
        model_name="consolidation_agent",
        agent_stage="consolidation",
        record_id=state.company_name or "unknown",
        event="consolidation_completed",
        description=(
            f"Merged {len(outputs)} outputs "
            f"[freshness={WEIGHT_FRESHNESS}, accuracy={WEIGHT_ACCURACY}, compliance={WEIGHT_COMPLIANCE}]"
        ),
        metadata={
            "model_scores": {o.model_name: s for o, s in zip(outputs, scores)},
            "merged_fields": [k for k in merged if not k.startswith("_")],
            "field_confidence": merged.get("_field_confidence", {}),
        },
        created_at=now,
    )
    all_provenance.append(consolidation_entry)

    record = _build_record(
        merged=merged,
        company_name=state.company_name or "unknown",
        provenance=all_provenance,
        scores=scores,
    )

    strict_profile = _build_strict_profile(merged)

    audit = AuditLogEntry(
        actor="consolidation_agent",
        action="consolidation_completed",
        message=f"Golden record created for '{record.company_name}' confidence={record.confidence_score}",
        metadata={"company_id": record.company_id, "sources": len(outputs)},
    )

    LOGGER.info(
        "Consolidation done: company_id=%s confidence=%.4f",
        record.company_id, record.confidence_score or 0.0,
    )

    # Save strict full profile as JSON during consolidation for immediate output visibility
    outputs_dir = os.path.join(os.path.dirname(__file__), '..', 'outputs')
    os.makedirs(outputs_dir, exist_ok=True)
    company_name_safe = state.company_name.replace(' ', '_').replace('/', '_').lower() if state.company_name else 'unknown'
    file_path = os.path.join(outputs_dir, f'{company_name_safe}.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(strict_profile, f, indent=2, ensure_ascii=False)
        LOGGER.info("Saved strict consolidated profile to file: %s", file_path)
    except Exception:
        LOGGER.exception("Failed to save strict consolidated profile file: %s", file_path)

    return {
        "consolidated_record": record,
        "full_profile": strict_profile,
        "provenance": state.provenance + all_provenance,
        "audit_logs": state.audit_logs + [audit],
        "updated_at": now,
        "metadata": {
            **state.metadata,
            "consolidation_stage": {
                "completed_at": now.isoformat(),
                "models_used": [o.model_name for o in outputs],
                "field_confidence": merged.get("_field_confidence", {}),
            },
        },
    }
