"""Deterministic jurisdiction configuration + Jurisdiction-Diff comparison engine."""
from app.jurisdictions.rules import build_jurisdiction_diff, validate_diff_response, DISCLAIMER

__all__ = ["build_jurisdiction_diff", "validate_diff_response", "DISCLAIMER"]
