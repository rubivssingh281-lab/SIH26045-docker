from app.pipeline.confidence import compute_confidence


def test_compute_confidence():
    dims = {"fact_conf": 0.8, "rule_fit_conf": 0.6, "evidence_conf": 1.0, "citation_conf": 0.9}
    result = compute_confidence(dims)
    assert result["overall_conf"] == 0.6
    assert result["band"] == "MEDIUM"
