import os
import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, AnyHttpUrl
import httpx

app = FastAPI()

# CORS for userscript usage from any origin by default; override via env if needed
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class BypassRequest(BaseModel):
    url: AnyHttpUrl
    user_agent: Optional[str] = None

class BypassResponse(BaseModel):
    ok: bool
    target: Optional[str] = None
    details: Optional[dict] = None

async def follow_redirects(url: str, user_agent: Optional[str] = None) -> str:
    headers = {"User-Agent": user_agent or "Mozilla/5.0"}
    async with httpx.AsyncClient(follow_redirects=True, headers=headers, timeout=20) as client:
        resp = await client.get(url)
        # If the URL uses meta refresh or JS, we won't catch it here; this is a baseline.
        return str(resp.url)

@app.post("/api/bypass", response_model=BypassResponse)
async def bypass(req: BypassRequest):
    try:
        target = await follow_redirects(req.url, req.user_agent)
        # Future: integrate vendor-specific bypassers from meobypass.py when safely refactored
        return BypassResponse(ok=True, target=target)
    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})

@app.get("/")
async def root():
    return {"status": "ok"}
