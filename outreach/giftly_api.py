"""Thin client for the Giftly internal platform API.

Used by send-batch.py and process-bounces.py to mirror pipeline activity into
outbound_messages. All calls require GIFTLY_API_TOKEN + GIFTLY_API_URL; if
either is unset, `is_configured()` returns False and callers should no-op
silently so the pipeline still works offline.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_URL = os.environ.get("GIFTLY_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("GIFTLY_API_TOKEN", "")
TIMEOUT = 15


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(f"{status} {code}: {message}")
        self.status = status
        self.code = code
        self.message = message


def is_configured() -> bool:
    return bool(API_URL) and bool(API_TOKEN)


def _request(method: str, path: str, *, body: dict | None = None, query: dict | None = None) -> Any:
    url = f"{API_URL}{path}"
    if query:
        clean = {k: v for k, v in query.items() if v is not None}
        if clean:
            url = f"{url}?{urllib.parse.urlencode(clean)}"
    data = None
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read().decode("utf-8") or "{}"
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode("utf-8") or "{}")
            err = payload.get("error") or {}
            raise ApiError(e.code, err.get("code", "http_error"), err.get("message", str(e)))
        except ApiError:
            raise
        except Exception:
            raise ApiError(e.code, "http_error", str(e))
    except urllib.error.URLError as e:
        raise ApiError(0, "network", str(e.reason))


def upsert_brand(brand_name: str, website: str) -> str:
    """Get-or-create a brand by root domain. Returns brand id."""
    result = _request(
        "POST",
        "/api/brands/upsert",
        body={"brand_name": brand_name, "website": website},
    )
    data = (result or {}).get("data") or {}
    bid = data.get("id")
    if not bid:
        raise ApiError(500, "no_id", "upsert response missing id")
    return bid


def log_outbound_message(
    *,
    entity_type: str,
    entity_id: str,
    channel: str,
    body: str,
    subject: str | None = None,
    sender_account: str | None = None,
    status: str = "sent",
    external_id: str | None = None,
    direction: str = "outbound",
    sent_at: str | None = None,
    metadata: dict | None = None,
) -> dict:
    payload: dict[str, Any] = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "channel": channel,
        "direction": direction,
        "body": body,
        "status": status,
    }
    if subject is not None:
        payload["subject"] = subject
    if sender_account is not None:
        payload["sender_account"] = sender_account
    if external_id is not None:
        payload["external_id"] = external_id
    if sent_at is not None:
        payload["sent_at"] = sent_at
    if metadata is not None:
        payload["metadata"] = metadata
    result = _request("POST", "/api/outbound/messages", body=payload)
    return (result or {}).get("data") or {}


def find_brand_by_contact_email(email: str) -> dict | None:
    result = _request("GET", "/api/brands", query={"q": email, "limit": 50})
    rows = (result or {}).get("data") or []
    # q matches many fields; prefer an exact contact_email hit.
    for r in rows:
        if (r.get("contact_email") or "").lower() == email.lower():
            return r
    return rows[0] if rows else None


def list_recent_sent_messages_for_brand(
    brand_id: str, *, since_iso: str | None = None, limit: int = 50
) -> list[dict]:
    query = {
        "entity_type": "brand",
        "entity_id": brand_id,
        "status": "sent",
        "direction": "outbound",
        "limit": limit,
    }
    if since_iso:
        query["since"] = since_iso
    result = _request("GET", "/api/outbound/messages", query=query)
    return (result or {}).get("data") or []


def patch_message_status(message_id: str, status: str) -> None:
    _request("PATCH", f"/api/outbound/messages/{message_id}", body={"status": status})
