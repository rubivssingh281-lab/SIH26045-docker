from app.pipeline.normalization import normalize_text


def test_normalize_text():
    assert normalize_text("  ASPIRIN  Tablet ") == "aspirin tablet"
