from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas, crud
from ..dependencies import get_current_teacher

router = APIRouter(prefix="/questions", tags=["Questions"])

@router.post("/", response_model=schemas.QuestionResponse)
def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    if not crud.get_exam(db, question.exam_id):
        raise HTTPException(status_code=404, detail="Examen non trouvé")
    return crud.create_question(db, question)

@router.get("/{question_id}", response_model=schemas.QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = crud.get_question(db, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question non trouvée")
    return q

@router.put("/{question_id}", response_model=schemas.QuestionResponse)
def update_question(
    question_id: int,
    question: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    updated = crud.update_question(db, question_id, question)
    if not updated:
        raise HTTPException(status_code=404, detail="Question non trouvée")
    return updated

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    if not crud.delete_question(db, question_id):
        raise HTTPException(status_code=404, detail="Question non trouvée")
    return {"message": "Question supprimée avec succès"}