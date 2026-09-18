"""
Paid-source connectors (staged feature 3).

Lets a user register THEIR OWN paid legal/IP database via an API key, so the
assistant can reach it — but only with explicit, logged consent (per the spec:
"the user's own paid subscriptions only with explicit, logged permission").

Deliberately thin: a small JSON-file registry (no new DB model, no new library —
httpx is already a dependency). Keys are stored locally and never returned in
full (masked to the last 4 chars). Every action is written to an audit log.
"""
import uuid
import json
import logging
import datetime
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connectors", tags=["Paid Connectors"])

_STORE = Path(__file__).resolve().parent.parent / "data" / "connectors.json"
_KNOWN_PROVIDERS = ["Custom REST API", "WIPO Patentscope", "Derwent Innovation",
                    "Manupatra", "SCC Online", "Espacenet"]


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _load() -> dict:
    if not _STORE.exists():
        return {"connectors": [], "audit": []}
    try:
        return json.loads(_STORE.read_text(encoding="utf-8"))
    except Exception:
        return {"connectors": [], "audit": []}


def _save(data: dict) -> None:
    _STORE.parent.mkdir(parents=True, exist_ok=True)
    _STORE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _audit(data: dict, action: str, name: str, detail: str = "") -> None:
    data.setdefault("audit", []).insert(0, {"time": _now(), "action": action, "connector": name, "detail": detail})
    data["audit"] = data["audit"][:100]  # keep last 100 events


def _mask(key: str) -> str:
    key = key or ""
    return ("•" * max(0, len(key) - 4) + key[-4:]) if len(key) > 4 else "••••"


def _public(c: dict) -> dict:
    """Connector as returned to the client — never includes the raw key."""
    return {
        "id": c["id"], "name": c["name"], "provider": c["provider"],
        "base_url": c["base_url"], "auth_type": c["auth_type"], "header_name": c["header_name"],
        "enabled": c.get("enabled", False), "consent": c.get("consent", False),
        "key_masked": _mask(c.get("api_key", "")),
        "created_at": c.get("created_at", ""), "last_tested": c.get("last_tested"),
        "last_status": c.get("last_status"),
    }


class ConnectorCreate(BaseModel):
    name: str = Field(..., min_length=1)
    provider: str = "Custom REST API"
    base_url: str = Field(..., min_length=4)
    api_key: str = Field(..., min_length=1)
    auth_type: str = Field("bearer", description="'bearer' or 'header'")
    header_name: str = Field("Authorization")
    consent: bool = Field(False, description="Explicit user authorization (required)")


@router.get("/providers")
def list_providers():
    return {"providers": _KNOWN_PROVIDERS}


@router.get("")
def list_connectors():
    data = _load()
    return {"connectors": [_public(c) for c in data.get("connectors", [])]}


@router.post("")
def add_connector(payload: ConnectorCreate):
    if not payload.consent:
        raise HTTPException(400, "Explicit consent is required to store and use a paid-source credential.")
    if not payload.base_url.startswith(("http://", "https://")):
        raise HTTPException(422, "base_url must start with http:// or https://")
    data = _load()
    c = {
        "id": uuid.uuid4().hex[:12], "name": payload.name.strip(), "provider": payload.provider,
        "base_url": payload.base_url.strip(), "api_key": payload.api_key.strip(),
        "auth_type": payload.auth_type, "header_name": payload.header_name.strip() or "Authorization",
        "enabled": True, "consent": True, "created_at": _now(),
        "last_tested": None, "last_status": None,
    }
    data.setdefault("connectors", []).append(c)
    _audit(data, "added", c["name"], f"{c['provider']} · consent granted")
    _save(data)
    return _public(c)


def _find(data: dict, cid: str) -> Optional[dict]:
    return next((c for c in data.get("connectors", []) if c["id"] == cid), None)


@router.patch("/{cid}")
def toggle_connector(cid: str, enabled: bool):
    data = _load()
    c = _find(data, cid)
    if not c:
        raise HTTPException(404, "Connector not found.")
    c["enabled"] = bool(enabled)
    _audit(data, "enabled" if enabled else "disabled", c["name"])
    _save(data)
    return _public(c)


@router.delete("/{cid}")
def delete_connector(cid: str):
    data = _load()
    c = _find(data, cid)
    if not c:
        raise HTTPException(404, "Connector not found.")
    data["connectors"] = [x for x in data["connectors"] if x["id"] != cid]
    _audit(data, "removed", c["name"])
    _save(data)
    return {"deleted": cid}


@router.post("/{cid}/test")
def test_connector(cid: str):
    """Make a single GET to the connector's base_url with the stored key (audited)."""
    data = _load()
    c = _find(data, cid)
    if not c:
        raise HTTPException(404, "Connector not found.")
    key = c.get("api_key", "")
    headers = ({c["header_name"]: f"Bearer {key}"} if c["auth_type"] == "bearer"
               else {c["header_name"]: key})
    result = {"ok": False, "status": None, "detail": ""}
    try:
        resp = httpx.get(c["base_url"], headers=headers, timeout=8.0, follow_redirects=True)
        result = {"ok": resp.status_code < 400, "status": resp.status_code,
                  "detail": f"HTTP {resp.status_code}"}
    except Exception as exc:
        result = {"ok": False, "status": None, "detail": f"Could not reach source: {exc}"}
    c["last_tested"] = _now()
    c["last_status"] = result["detail"]
    _audit(data, "tested", c["name"], result["detail"])
    _save(data)
    return {**result, "connector": _public(c)}


@router.get("/audit")
def get_audit():
    return {"audit": _load().get("audit", [])}
