from typing import Dict, Any

def compute_confidence(dimensions: Dict[str, float]) -> Dict[str, Any]:
    """
    Computes multidimensional confidence using a weakest-link (min-gated) formula.
    dimensions should contain: 
    fact_conf, rule_fit_conf, evidence_conf, citation_conf
    """
    if not dimensions:
        return {
            "overall_conf": 0.0,
            "band": "INSUFFICIENT",
            "dimensions": {}
        }
        
    # The weakest-link rule: overall confidence is the minimum of all dimension scores.
    overall_conf = min(dimensions.values())
    
    # Determine band based on MVP specs
    band = "INSUFFICIENT"
    if overall_conf >= 0.80:
        band = "HIGH"
    elif overall_conf >= 0.50:
        band = "MEDIUM"
    elif overall_conf >= 0.25:
        band = "LOW"
        
    return {
        "fact_conf": round(float(dimensions.get("fact_conf", 0.0)), 4),
        "rule_fit_conf": round(float(dimensions.get("rule_fit_conf", 0.0)), 4),
        "evidence_conf": round(float(dimensions.get("evidence_conf", 0.0)), 4),
        "citation_conf": round(float(dimensions.get("citation_conf", 0.0)), 4),
        "overall_conf": round(overall_conf, 4),
        "band": band,
        "dimensions": dimensions
    }
