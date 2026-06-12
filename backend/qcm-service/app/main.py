# backend/qcm-service/main.py

"""QCM Service - Port 8010
Correction des questions à choix multiples
"""

import json
from typing import Any, Dict, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="QCM Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_mention(p: float) -> str:
    """Retourne la mention selon le pourcentage"""
    if p >= 85:
        return "Excellent"
    if p >= 70:
        return "Bien"
    if p >= 55:
        return "Assez bien"
    if p >= 40:
        return "Passable"
    return "Insuffisant"


def parse_reponses(raw) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except:
        return {}


def corriger_qcm(questions_exam: list, reponses_etudiant: dict) -> dict:
    note_obtenue = 0.0
    total_possible = 0.0
    details = []

    for question in questions_exam:
        if question.type_question != "qcm":
            continue
        try:
            data = parse_reponses(question.reponse_correcte)
            choix = data.get("choix", [])
            bonne_reponse_idx = data.get("bonne_reponse", 0)
        except:
            continue

        points_question = float(question.points or 1)
        total_possible += points_question
        reponse_idx = reponses_etudiant.get(str(question.id))

        if reponse_idx is None:
            details.append(
                {
                    "question_id": question.id,
                    "texte": question.texte[:80],
                    "points_question": points_question,
                    "points_obtenus": 0,
                    "reponse_etudiant": None,
                    "bonne_reponse": choix[bonne_reponse_idx] if choix else "?",
                    "correct": False,
                    "statut": "non_repondu",
                }
            )
        else:
            try:
                reponse_idx = int(reponse_idx)
            except (ValueError, TypeError):
                reponse_idx = -1

            if 0 <= reponse_idx < len(choix):
                if reponse_idx == bonne_reponse_idx:
                    note_obtenue += points_question
                    details.append(
                        {
                            "question_id": question.id,
                            "texte": question.texte[:80],
                            "points_question": points_question,
                            "points_obtenus": points_question,
                            "reponse_etudiant": (
                                choix[reponse_idx] if choix else str(reponse_idx)
                            ),
                            "bonne_reponse": choix[bonne_reponse_idx] if choix else "?",
                            "correct": True,
                            "statut": "correct",
                        }
                    )
                else:
                    details.append(
                        {
                            "question_id": question.id,
                            "texte": question.texte[:80],
                            "points_question": points_question,
                            "points_obtenus": 0,
                            "reponse_etudiant": (
                                choix[reponse_idx] if choix else str(reponse_idx)
                            ),
                            "bonne_reponse": choix[bonne_reponse_idx] if choix else "?",
                            "correct": False,
                            "statut": "incorrect",
                        }
                    )
            else:
                details.append(
                    {
                        "question_id": question.id,
                        "texte": question.texte[:80],
                        "points_question": points_question,
                        "points_obtenus": 0,
                        "reponse_etudiant": f"Index invalide: {reponse_idx}",
                        "bonne_reponse": choix[bonne_reponse_idx] if choix else "?",
                        "correct": False,
                        "statut": "invalide",
                    }
                )

    pourcentage = (
        round((note_obtenue / total_possible * 100), 1) if total_possible > 0 else 0
    )
    mention = get_mention(pourcentage)

    return {
        "note": round(note_obtenue, 2),
        "total": round(total_possible, 2),
        "pourcentage": pourcentage,
        "mention": mention,
        "details": details,
    }
class QuestionQCM(BaseModel):
    id: int
    texte: str
    points: float
    type_question: str = "qcm"
    reponse_correcte: str | None = None


class CorrectRequest(BaseModel):
    copie_id: int
    questions_exam: List[QuestionQCM]
    reponses_etudiant: Dict[str, Any]


@app.post("/qcm/correct")
async def correct_qcm(req: CorrectRequest):
    """Corrige les questions QCM"""
    result = corriger_qcm(req.questions_exam, req.reponses_etudiant)
    return result

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "qcm-service"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
