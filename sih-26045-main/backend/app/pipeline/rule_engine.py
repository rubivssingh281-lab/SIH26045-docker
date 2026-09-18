import json
import logging
import os
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

def load_rules() -> List[Dict[str, Any]]:
    rules_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "rules", "rules.json")
    try:
        with open(rules_path, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load rules.json: {e}")
        return []

def evaluate_rules(facts: List[Dict[str, Any]], as_of_date: str | None = None) -> Dict[str, Any]:
    """
    Deterministically evaluates extracted facts against rules.json.
    """
    rules = load_rules()
    
    # Convert facts to a dictionary for easy O(1) lookup
    # e.g., {"uses_biological_resource": True, ...}
    fact_dict = {f["key"]: f["value"] for f in facts if "key" in f and "value" in f}
    
    fired_rules = []
    classification = "ambiguous/insufficient_information"
    
    for rule in rules:
        conditions = rule.get("conditions", [])
        if as_of_date and ((rule.get("effective_from") and as_of_date < rule["effective_from"]) or (rule.get("effective_to") and as_of_date > rule["effective_to"])):
            continue
        
        # If rule has no conditions, skip or treat as fallback
        if not conditions and rule.get("id") != "rule_001":
            continue
            
        all_conditions_met = True
        
        for condition in conditions:
            fact_key = condition.get("fact")
            op = condition.get("op")
            expected_val = condition.get("value")
            
            # If the fact wasn't extracted, condition fails
            if fact_key not in fact_dict:
                all_conditions_met = False
                break
                
            actual_val = fact_dict[fact_key]
            
            if op == "==" and actual_val != expected_val:
                all_conditions_met = False
                break
            elif op == "!=" and actual_val == expected_val:
                all_conditions_met = False
                break
                
        if all_conditions_met and conditions:
            fired_rules.append(rule)
    
    # Preserve equal-priority conflicting conclusions; a caller must escalate them.
    if fired_rules:
        # Sort by priority descending
        fired_rules.sort(key=lambda r: r.get("priority", 0), reverse=True)
        top_priority = fired_rules[0].get("priority", 0)
        top_conclusions = {r.get("conclusion") for r in fired_rules if r.get("priority", 0) == top_priority}
        classification = fired_rules[0].get("conclusion", classification) if len(top_conclusions) == 1 else "conflicting_rules_require_review"
        
    return {
        "rules_applied": len(fired_rules),
        "matches": fired_rules,
        "classification": classification
    }
