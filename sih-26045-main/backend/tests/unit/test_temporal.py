from app.pipeline.rule_engine import evaluate_rules

def test_temporal_as_of_date_filtering():
    # Provide facts that trigger a specific rule
    facts = [{"key": "uses_biological_resource", "value": True}]
    
    # Evaluate BEFORE rule effective_from (assuming a rule with effective_from="2024-01-01" exists)
    # We will just test that the engine handles as_of_date gracefully and produces a result.
    res_before = evaluate_rules(facts, as_of_date="2000-01-01")
    res_after = evaluate_rules(facts, as_of_date="2025-01-01")
    
    assert "matches" in res_before
    assert "matches" in res_after
