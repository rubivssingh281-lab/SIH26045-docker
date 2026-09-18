"""Paid-connector registry tests. Store is redirected to a temp file; network stubbed."""
import pytest
from fastapi import HTTPException

from app.api import connectors as C


@pytest.fixture(autouse=True)
def _tmp_store(tmp_path, monkeypatch):
    monkeypatch.setattr(C, "_STORE", tmp_path / "connectors.json")


def _payload(**over):
    base = dict(name="My WIPO", provider="WIPO Patentscope", base_url="https://example.com/api",
                api_key="SECRET-KEY-1234", auth_type="bearer", header_name="Authorization", consent=True)
    base.update(over)
    return C.ConnectorCreate(**base)


def test_consent_required():
    with pytest.raises(HTTPException) as e:
        C.add_connector(_payload(consent=False))
    assert e.value.status_code == 400


def test_add_masks_key_and_audits():
    c = C.add_connector(_payload())
    assert c["key_masked"].endswith("1234") and "SECRET" not in c["key_masked"]
    assert "api_key" not in c                       # raw key never returned
    listed = C.list_connectors()["connectors"]
    assert len(listed) == 1 and listed[0]["consent"] is True
    assert C.get_audit()["audit"][0]["action"] == "added"


def test_bad_url_rejected():
    with pytest.raises(HTTPException) as e:
        C.add_connector(_payload(base_url="ftp://nope"))
    assert e.value.status_code == 422


def test_toggle_and_delete():
    c = C.add_connector(_payload())
    off = C.toggle_connector(c["id"], enabled=False)
    assert off["enabled"] is False
    assert C.delete_connector(c["id"])["deleted"] == c["id"]
    assert C.list_connectors()["connectors"] == []


def test_test_connection(monkeypatch):
    c = C.add_connector(_payload())

    class _Resp:
        status_code = 200
    monkeypatch.setattr(C.httpx, "get", lambda *a, **k: _Resp())
    res = C.test_connector(c["id"])
    assert res["ok"] is True and res["status"] == 200
    assert any(e["action"] == "tested" for e in C.get_audit()["audit"])
