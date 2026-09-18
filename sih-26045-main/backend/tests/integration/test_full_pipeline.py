from app.pipeline.rule_engine import evaluate_rules


def test_confirmed_facts_reach_deterministic_rule_engine():
    result = evaluate_rules([
        {"key": "uses_biological_resource", "value": True},
        {"key": "commercial_intent", "value": True},
    ], "2024-01-01")
    assert result["classification"] == "ABS approval required (amended regime)"
    assert result["rules_applied"] == 1
