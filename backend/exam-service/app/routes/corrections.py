from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from .. import crud

router = APIRouter(prefix="/corrections", tags=["Corrections"])

class CorrectionSaveRequest(BaseModel):
    question_id: int
    points_obtenus: float
    feedback: str = ""
    similarity_score: Optional[float] = None

@router.post("/{copie_id}/save")
async def save_correction(
    copie_id: int,
    request: CorrectionSaveRequest,
    db: Session = Depends(get_db)
):
    try:
        question = crud.get_question(db, request.question_id)
        if not question:
            raise HTTPException(404, f"Question {request.question_id} non trouvée")

        copie = crud.get_copie(db, copie_id)
        reponse_etudiant = (
            copie.reponses.get(str(request.question_id))
            if copie and copie.reponses
            else None
        )

        result = db.execute(
            text(
                "SELECT id FROM exam.correction_details WHERE copie_id = :copie_id AND question_id = :question_id"
            ),
            {"copie_id": copie_id, "question_id": request.question_id},
        ).first()

        if result:
            db.execute(
                text("""
                    UPDATE exam.correction_details 
                    SET points_obtenus = :points_obtenus, feedback = :feedback,
                        similarity_score = :similarity_score, correct = :correct,
                        reponse_etudiant = :reponse_etudiant, bonne_reponse = :bonne_reponse
                    WHERE copie_id = :copie_id AND question_id = :question_id
                """),
                {
                    "copie_id": copie_id,
                    "question_id": request.question_id,
                    "points_obtenus": request.points_obtenus,
                    "feedback": request.feedback,
                    "similarity_score": request.similarity_score,
                    "correct": request.points_obtenus == float(question.points),
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": question.reponse_correcte,
                },
            )
        else:
            db.execute(
                text("""
                    INSERT INTO exam.correction_details 
                    (copie_id, question_id, points_obtenus, points_possibles, 
                     correct, statut, feedback, similarity_score, reponse_etudiant, bonne_reponse)
                    VALUES (:copie_id, :question_id, :points_obtenus, :points_possibles,
                            :correct, 'manuel', :feedback, :similarity_score, :reponse_etudiant, :bonne_reponse)
                """),
                {
                    "copie_id": copie_id,
                    "question_id": request.question_id,
                    "points_obtenus": request.points_obtenus,
                    "points_possibles": float(question.points),
                    "correct": request.points_obtenus == float(question.points),
                    "feedback": request.feedback,
                    "similarity_score": request.similarity_score,
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": question.reponse_correcte,
                },
            )

        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/copie/{copie_id}")
async def get_corrections_by_copie(copie_id: int, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("SELECT * FROM exam.correction_details WHERE copie_id = :copie_id"),
            {"copie_id": copie_id},
        ).fetchall()
        return [dict(r._mapping) for r in result]
    except Exception:
        return []

@router.get("/copie/{copie_id}/details")
async def get_correction_details(copie_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        text("""
            SELECT cd.*, q.texte as question_texte
            FROM exam.correction_details cd
            JOIN exam.questions q ON cd.question_id = q.id
            WHERE cd.copie_id = :copie_id
            ORDER BY q.ordre
        """),
        {"copie_id": copie_id},
    ).fetchall()
    return [dict(r._mapping) for r in result]