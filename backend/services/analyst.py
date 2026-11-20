"""EvoPay AI Analyst — Gemini, served from the FastAPI backend.

Runs on Cloud Run; Vercel forwards /api/* here. The key comes from GEMINI_API_KEY,
injected from Google Secret Manager. Without a key it answers 503 and the frontend
falls back to its built-in analyst.
"""
from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from ..auth import current_user
except ImportError:  # running as a script from backend/
    from auth import current_user

router = APIRouter()

MAX_CONTEXT = 14000
SYSTEM = """You are EvoPay's fraud analyst copilot, embedded in a payment-fraud red-team / blue-team platform.
EvoPay scores every payment 0-100 from four signals: ML classifier (35%), graph intelligence (25%), anomaly detection (20%), behavioural analysis (20%).
Decisions: 0-30 ALLOW, 31-60 VERIFY (step-up auth), 61-80 HOLD (analyst queue), 81-100 BLOCK.
Rules:
- Use only the data provided in CONTEXT. Never invent transactions, amounts, entities or metrics.
- If the data does not answer the question, say what is missing.
- Be concise and practical: a one-line verdict, then at most 5 short bullet points, then one recommended next action.
- Plain text only. Use "- " for bullets. No markdown headings, no tables.
- Amounts are Indian rupees (₹)."""

PROMPTS = {
    "transaction": "Write an investigation brief for this transaction: verdict, the evidence that drove the score, likely fraud pattern, and what the analyst should do next.",
    "scenario": "Explain this risk scenario from the playground: why it scored the way it did, which signal matters most, and what would change the decision.",
    "arena": "Summarise this attack-evolution run for a judge: when the attack started evading, how the defence adapted, and what the result proves.",
    "chat": "",
}


class AnalystRequest(BaseModel):
    mode: str = "chat"
    question: str = Field(default="", max_length=600)
    context: Any = None


@router.post("/api/analyst")
def analyst(payload: AnalystRequest, user: dict = Depends(current_user)) -> dict:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "not_configured")
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    mode = payload.mode if payload.mode in PROMPTS else "chat"
    task = (payload.question or "Summarise the current fraud posture.") if mode == "chat" else PROMPTS[mode]
    context = json.dumps(payload.context if payload.context is not None else {}, default=str)[:MAX_CONTEXT]
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": f"TASK: {task}\n\nCONTEXT (JSON):\n{context}"}]}],
        "generationConfig": {"maxOutputTokens": 700},
    }
    try:
        response = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            json=body,
            timeout=30,
        )
    except httpx.HTTPError as error:
        raise HTTPException(502, "gemini_unreachable") from error
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        raise HTTPException(502, (data.get("error") or {}).get("message", "gemini_error"))
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise HTTPException(502, "empty_response")
    return {"text": text, "source": "gemini", "model": model}
