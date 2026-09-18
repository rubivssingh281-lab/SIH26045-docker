from app.pipeline.rule_engine import evaluate_rules


def test_evaluate_rules_returns_structure():
    result = evaluate_rules([])
    assert result["rules_applied"] == 0
    assert isinstance(result["matches"], list)
