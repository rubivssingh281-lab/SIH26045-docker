def build_fact_extraction_prompt(case_text: str) -> str:
    return f"Extract facts from the following case summary:\n\n{case_text}"


def build_explanation_prompt(answer: str) -> str:
    return f"Explain the reasoning behind this answer:\n\n{answer}"
