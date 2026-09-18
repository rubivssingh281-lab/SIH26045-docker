from app.pipeline.citation_validation import validate_citations

def test_answer_to_citation():
    citations = [{"text": "this is a valid piece of evidence"}]
    facts = [{"key": "test", "value": "valid piece"}]
    
    validated = validate_citations(citations, facts)
    assert len(validated) == 1
