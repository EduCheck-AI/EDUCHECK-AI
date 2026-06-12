"""
EXAM SERVICE - Gestion des examens
Port: 8002
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routes import (
    exams_router,
    questions_router,
    copies_router,
    corrections_router,
    exports_router,
    stats_router,
    debug_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création des tables
Base.metadata.create_all(bind=engine)

# Application FastAPI
app = FastAPI(title="Exam Service", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
app.include_router(exams_router)
app.include_router(questions_router)
app.include_router(copies_router)
app.include_router(corrections_router)
app.include_router(exports_router)
app.include_router(stats_router)
app.include_router(debug_router)

@app.get("/")
async def root():
    return {"service": "Exam Service", "version": "2.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "exam-service"}

# ============================================================
# ROUTES DE REDIRECTION POUR COMPATIBILITÉ
# ============================================================

@app.get("/copies/{copie_id}/export/pdf")
async def redirect_copie_pdf(copie_id: int):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/pdf")

@app.get("/copies/{copie_id}/export/csv")
async def redirect_copie_csv(copie_id: int):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/csv")

@app.get("/copies/{copie_id}/export/json")
async def redirect_copie_json(copie_id: int):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/json")

@app.get("/exams/{exam_id}/export/class/pdf")
async def redirect_class_pdf(exam_id: int):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/exams/{exam_id}/class/pdf")

@app.get("/exams/{exam_id}/export/class/csv")
async def redirect_class_csv(exam_id: int):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/exams/{exam_id}/class/csv")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)