# backend/results-service/main.py

"""Results Service - Port 8013
Agrège les notes détaillées pour produire note totale + pourcentage + mention
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Results Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AggregateRequest(BaseModel):
    sections: List[Dict[str, Any]]


class AggregateResponse(BaseModel):
    note: float
    total: float
    pourcentage: float
    mention: str
    details: List[Dict[str, Any]]


def get_mention(p: float) -> str:
    if p >= 85:
        return "Excellent"
    if p >= 70:
        return "Bien"
    if p >= 55:
        return "Assez bien"
    if p >= 40:
        return "Passable"
    return "Insuffisant"


@app.post("/results/aggregate", response_model=AggregateResponse)
async def aggregate(req: AggregateRequest):
    total = 0.0
    note = 0.0
    all_details = []

    for sec in req.sections:
        note += float(sec.get("note", 0) or 0)
        total += float(sec.get("total", 0) or 0)
        details = sec.get("details", []) or []
        all_details.extend(details)

    pourcentage = round((note / total * 100), 1) if total > 0 else 0.0

    return AggregateResponse(
        note=round(note, 2),
        total=round(total, 2),
        pourcentage=pourcentage,
        mention=get_mention(pourcentage),
        details=all_details,
    )


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "results-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)