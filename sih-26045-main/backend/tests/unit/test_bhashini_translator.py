import pytest

from app.translation.bhashini_translator import (
    BhashiniTranslationError,
    BhashiniTranslator,
    _extract_outputs,
    _find_service_id,
    language_code,
)


def test_language_names_are_mapped_to_bhashini_codes():
    assert language_code("Hindi") == "hi"
    assert language_code("en-IN") == "en"
    assert language_code("Tamil") == "ta"


def test_unknown_language_is_rejected():
    with pytest.raises(BhashiniTranslationError):
        language_code("not-a-language")


def test_pipeline_response_outputs_preserve_order():
    response = {
        "pipelineResponse": [{
            "taskType": "translation",
            "output": [{"target": "पहला"}, {"target": "दूसरा"}],
        }]
    }
    assert _extract_outputs(response) == ["पहला", "दूसरा"]


def test_discovery_task_config_contains_service_id():
    configs = [{"taskType": "translation", "config": [{"serviceId": "translation-service"}]}]
    assert _find_service_id(configs, "translation") == "translation-service"


def test_missing_credentials_fail_before_network_call():
    translator = BhashiniTranslator(api_key="", user_id="")
    with pytest.raises(BhashiniTranslationError, match="BHASHINI_API_KEY"):
        translator.translate_text("hello", "Hindi")