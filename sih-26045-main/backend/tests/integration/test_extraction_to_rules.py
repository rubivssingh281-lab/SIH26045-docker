from app.pipeline.fact_extraction import extract_facts
from app.pipeline.rule_engine import evaluate_rules

def test_extraction_to_rules():
    # Simulate extraction
    extracted = extract_facts("The formulation uses holy basil (ocimum sanctum).")
    
    # Simulate user confirmation and normalization
    facts = []
    for f in extracted:
        f["value"] = True
        facts.append(f)
        
    # Run rules
    res = evaluate_rules(facts)
    assert res is not None
    assert "classification" in res
