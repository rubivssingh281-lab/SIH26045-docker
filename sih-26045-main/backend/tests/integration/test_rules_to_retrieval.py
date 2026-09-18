from app.pipeline.rule_engine import evaluate_rules
from app.rag.prior_art import find_prior_art

def test_rules_to_retrieval():
    facts = [{"key": "uses_biological_resource", "value": True}]
    res = evaluate_rules(facts)
    
    # Simulate generating a query from rule matches
    query = "biological resource"
    if res["matches"]:
        query = res["matches"][0].get("summary", query)
        
    retrieval = find_prior_art(query, limit=2)
    assert retrieval is not None
    assert "results" in retrieval
