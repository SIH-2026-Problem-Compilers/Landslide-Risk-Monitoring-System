"""Multi-channel alert delivery adapters (SMS / WhatsApp / webhook).

Closes the predict -> warn loop created by ``POST /api/v1/ml/evaluate``:
every newly raised alert is handed to this module, which dispatches it
through the channel configured in the environment. Nothing is required to
run the project — with no credentials the adapter only logs, so dev/demo
runs never message real people.

Configuration (all optional, read at call time):

  NOTIFY_CHANNEL      log (default) | twilio | msg91 | webhook | off
  NOTIFY_RECIPIENTS   comma-separated destinations (phone numbers with
                      country code, or webhook addresses). No subscriber
                      directory exists yet, so alerts fan out to this list.
  NOTIFY_FROM         sender id / from-number (MSG91 sender or Twilio number)

  Twilio (SMS + WhatsApp, https://www.twilio.com/console)
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM  (e.g. +14155550100)
  WhatsApp variant: set TWILIO_FROM to ``whatsapp:+14155550100`` and put
  ``whatsapp:`` in front of each NOTIFY_RECIPIENTS entry.

  MSG91 (India DLT-registered SMS/WhatsApp, https://control.msg91.com)
  MSG91_API_KEY, MSG91_TEMPLATE_ID (DLT content template), NOTIFY_FROM
  (6-char DLT sender id), MSG91_FLOW_URL override.

  Generic webhook (Slack/Discord/custom collector)
  NOTIFY_WEBHOOK_URL  POSTs {title, message, severity, district, source, ...}

Each call returns {"channel", "sent", "detail"} and never raises — a failed
delivery must not break alert creation.
"""
from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

TIMEOUT = 10


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _recipients() -> list[str]:
    raw = _env("NOTIFY_RECIPIENTS")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _post(url: str, payload: dict, headers: dict) -> tuple[int, str]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": "application/json", **headers},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.status, response.read().decode("utf-8", "replace")[:400]
    except urllib.error.HTTPError as exc:  # API answered with an error
        return exc.code, str(exc.reason)
    except (urllib.error.URLError, OSError) as exc:
        return 0, str(exc)


def _send_log(alert: dict, recipients: list[str]) -> dict:
    print(
        f"[notify:log] {alert.get('severity', '?').upper()} "
        f"{alert.get('district', '')}: {alert.get('title', '')} "
        f"-> {len(recipients) or 'no'} recipient(s)"
    )
    return {"channel": "log", "sent": len(recipients), "detail": "logged only"}


def _send_twilio(alert: dict, recipients: list[str]) -> dict:
    sid, token = _env("TWILIO_ACCOUNT_SID"), _env("TWILIO_AUTH_TOKEN")
    sender = _env("TWILIO_FROM", _env("NOTIFY_FROM"))
    if not (sid and token and sender and recipients):
        return {"channel": "twilio", "sent": 0, "detail": "twilio not configured"}
    basic = base64.b64encode(f"{sid}:{token}".encode()).decode()
    sent = 0
    details = []
    for to in recipients:
        status, detail = _post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            {"To": to, "From": sender, "Body": f"{alert.get('title')}\n{alert.get('message')}"},
            {"Authorization": f"Basic {basic}"},
        )
        if 200 <= status < 300:
            sent += 1
        else:
            details.append(f"{to}: {status} {detail}")
    return {
        "channel": "twilio",
        "sent": sent,
        "detail": "; ".join(details) or "ok",
    }


def _send_msg91(alert: dict, recipients: list[str]) -> dict:
    api_key, template = _env("MSG91_API_KEY"), _env("MSG91_TEMPLATE_ID")
    sender = _env("NOTIFY_FROM", _env("MSG91_SENDER"))
    flow_url = _env("MSG91_FLOW_URL", "https://control.msg91.com/api/v5/flow/")
    if not (api_key and template and recipients):
        return {"channel": "msg91", "sent": 0, "detail": "msg91 not configured"}
    payload = {
        "template_id": template,
        "recipients": [
            {
                "mobiles": to.lstrip("+"),
                "VAR1": alert.get("title", ""),
                "VAR2": alert.get("message", ""),
                "VAR3": str(alert.get("severity", "")),
            }
            for to in recipients
        ],
    }
    if sender:
        payload["sender"] = sender
    status, detail = _post(flow_url, payload, {"authkey": api_key})
    ok = 200 <= status < 300
    return {
        "channel": "msg91",
        "sent": len(recipients) if ok else 0,
        "detail": "ok" if ok else f"{status} {detail}",
    }


def _send_webhook(alert: dict, recipients: list[str]) -> dict:
    url = _env("NOTIFY_WEBHOOK_URL")
    if not url:
        return {"channel": "webhook", "sent": 0, "detail": "NOTIFY_WEBHOOK_URL not set"}
    status, detail = _post(url, alert, {})
    ok = 200 <= status < 300
    return {
        "channel": "webhook",
        "sent": 1 if ok else 0,
        "detail": "ok" if ok else f"{status} {detail}",
    }


_DISPATCH = {
    "log": _send_log,
    "off": lambda alert, recipients: {"channel": "off", "sent": 0, "detail": "disabled"},
    "twilio": _send_twilio,
    "msg91": _send_msg91,
    "webhook": _send_webhook,
}


def send_alert(alert: dict) -> dict:
    """Dispatch one alert dict through the configured channel. Never raises."""
    channel = (_env("NOTIFY_CHANNEL") or "log").lower()
    handler = _DISPATCH.get(channel, _send_log)
    recipients = _recipients()
    try:
        result = handler(alert, recipients)
    except Exception as exc:  # delivery must never break alert creation
        result = {"channel": channel, "sent": 0, "detail": f"error: {exc}"}
    return {**result, "at": datetime.now(timezone.utc).isoformat()}
