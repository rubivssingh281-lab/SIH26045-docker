import json
from pathlib import Path


def load_rules(path: str | None = None):
    rule_path = Path(path) if path else Path(__file__).with_name("rules.json")
    with rule_path.open("r", encoding="utf-8") as fh:
        return json.load(fh)
