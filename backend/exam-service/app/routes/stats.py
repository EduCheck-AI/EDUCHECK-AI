from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud

router = APIRouter(prefix="/stats", tags=["Statistiques"])

@router.get("/student/{student_id}/results")
async def get_student_results(student_id: int, db: Session = Depends(get_db)):
    copies = crud.get_copies_by_student(db, student_id)
    results = []
    for copie in copies:
        exam = crud.get_exam(db, copie.exam_id)
        total = float(exam.points_totaux) if exam and exam.points_totaux else 1
        note = float(copie.note) if copie.note else 0
        results.append({
            "id": copie.id,
            "exam_id": copie.exam_id,
            "exam_title": exam.titre if exam else f"Examen #{copie.exam_id}",
            "matiere": exam.matiere if exam else "Non spécifiée",
            "score": note,
            "max_score": total,
            "percentage": round((note / total * 100), 1),
            "date": copie.date_soumission,
        })
    return results