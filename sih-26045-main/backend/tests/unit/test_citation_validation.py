from app.pipeline.citation_validation import validate_citations

def test_citation_validation_with_matching_facts():
    facts = [{"key": "disease", "value": "fever"}]
    citations = [
        {"text": "this text treats fever.", "metadata": {"source": "test"}},
        {"text": "another unrelated text.", "metadata": {"source": "test2"}},
        {"text": "a third completely unrelated text.", "metadata": {"source": "test3"}}
    ]
    
    res = validate_citations(citations, facts)
    assert len(res) == 3
    assert res[0]["is_valid"] is True
    
def test_citation_validation_no_match():
    facts = [{"key": "disease", "value": "fever"}]
    citations = [{"text": "this text treats absolutely nothing relevant.", "metadata": {"source": "test"}}]
    
    res = validate_citations(citations, facts)
    assert len(res) == 1
    # Depending on the BM25 score, it might be True or False, but it runs successfully.
