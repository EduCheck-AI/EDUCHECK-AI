from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.logger import logger
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from ..database import get_db
from .. import schemas, crud
from ..dependencies import get_current_teacher, get_current_user
from ..utils.pdf_utils import is_pdf_with_text, extract_text_from_pdf
from ..utils.ocr_client import call_ocr_service

router = APIRouter(prefix="/exams", tags=["Examens"])

# ========== EXAMENS CRUD ==========

@router.get("/", response_model=list[schemas.ExamResponse])
def read_exams(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    teacher_id = current_user.get("id")
    return crud.get_exams_by_teacher(db, teacher_id)

@router.post("/", response_model=schemas.ExamResponse)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    if exam.id_enseignant != current_user["id"]:
        raise HTTPException(403, "Vous ne pouvez créer un examen qu'avec votre propre ID")
    return crud.create_exam(db, exam)

@router.get("/{exam_id}", response_model=schemas.ExamResponse)
def read_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    return exam

@router.put("/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(
    exam_id: int,
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(404, "Examen non trouvé")
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(403, "Vous ne pouvez modifier que vos propres examens")
    return crud.update_exam(db, exam_id, exam)

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(404, "Examen non trouvé")
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(403, "Vous ne pouvez supprimer que vos propres examens")
    if crud.delete_exam(db, exam_id):
        return {"message": "Examen supprimé avec succès"}
    return {"message": "Échec de la suppression"}

@router.put("/{exam_id}/publish", response_model=schemas.ExamResponse)
def publish_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(404, "Examen non trouvé")
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(403, "Vous ne pouvez publier que vos propres examens")
    return crud.publish_exam(db, exam_id)

@router.get("/teacher/{teacher_id}", response_model=list[schemas.ExamResponse])
def read_exams_by_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    return crud.get_exams_by_teacher(db, teacher_id)

@router.post("/import")
async def import_exam(
    file: UploadFile = File(...),
    auto_create: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher),
):
    try:
        logger.info(f"📥 Import: {file.filename} par enseignant {current_user['id']}")
        extension = file.filename.split(".")[-1].lower()

        if extension == "pdf":
            if is_pdf_with_text(file):
                text = extract_text_from_pdf(file)
            else:
                text = await call_ocr_service(file)
        elif extension in ["jpg", "jpeg", "png"]:
            text = await call_ocr_service(file)
        elif extension == "txt":
            content = await file.read()
            text = content.decode("utf-8")
            await file.seek(0)
        else:
            raise HTTPException(400, detail=f"Format non supporté: {extension}")

        from ..utils.exam_parser import parse_exam_text_with_groq

        parsed_data = await parse_exam_text_with_groq(text)

        exam_data = {
            "titre": parsed_data.get("titre", "Examen sans titre"),
            "description": parsed_data.get("description", ""),
            "matiere": parsed_data.get("matiere", "Général"),
            "id_enseignant": current_user["id"],
            "points_totaux": parsed_data.get("points_totaux", 20.0),
            "statut": "brouillon",
            "contenu_brut": text,
        }
        questions_data = parsed_data.get("questions", [])

        response = {
            "success": True,
            "message": "Fichier traité avec succès",
            "filename": file.filename,
            "preview": {
                "titre": exam_data["titre"],
                "matiere": exam_data["matiere"],
                "questions_count": len(questions_data),
                "points_totaux": exam_data["points_totaux"],
            },
        }

        if auto_create:
            exam_create = schemas.ExamCreate(**exam_data)
            new_exam = crud.create_exam(db, exam_create)
            questions_created = 0

            for i, q in enumerate(questions_data):
                try:
                    reponse_correcte = None
                    if q.get("type") == "qcm" and q.get("reponse_correcte"):
                        reponse_correcte = json.dumps(
                            q["reponse_correcte"], ensure_ascii=False
                        )

                    q_create = schemas.QuestionCreate(
                        exam_id=new_exam.id,
                        texte=q["texte"],
                        points=q.get("points", 2),
                        type_question=q.get("type", "ouverte"),
                        ordre=q.get("ordre", i + 1),
                        reponse_correcte=reponse_correcte,
                    )
                    crud.create_question(db, q_create)
                    questions_created += 1
                except Exception as e:
                    logger.error(f"Erreur création question {i}: {e}")

            response["exam_created"] = {
                "id": new_exam.id,
                "titre": new_exam.titre,
                "questions_created": questions_created,
            }
            response["message"] = f"Examen importé avec {questions_created} questions"

        return response
    except Exception as e:
        logger.error(f"Erreur import: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{exam_id}/pdf")
async def exporter_examen_pdf(exam_id: int, db: Session = Depends(get_db)):
    from fastapi import Response
    import httpx
    from ..config import settings
    
    examen = crud.get_exam(db, exam_id)
    if not examen:
        raise HTTPException(status_code=404, detail="Examen non trouvé")

    if examen.contenu_brut:
        texte = examen.contenu_brut
    else:
        questions_db = crud.get_questions_by_exam(db, exam_id)
        texte = f"{examen.titre}\nMatière: {examen.matiere}\nTotal: {examen.points_totaux} points\n\n"
        for i, q in enumerate(questions_db, 1):
            texte += f"Question {i} ({float(q.points or 1)} pts)\n{q.texte}\n\n"

    try:
        async with httpx.AsyncClient(timeout=400.0) as client:
            r = await client.post(
                f"{settings.OCR_SERVICE_URL}/ocr/process-pdf",
                files={"file": (f"examen_{exam_id}.txt", texte.encode("utf-8"), "text/plain")}
            )
            r.raise_for_status()
        return Response(
            content=r.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=examen_{exam_id}.pdf"}
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service OCR indisponible")

@router.get("/{exam_id}/questions", response_model=list[schemas.QuestionResponse])
def get_exam_questions(exam_id: int, db: Session = Depends(get_db)):
    """Récupère toutes les questions d'un examen"""
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examen non trouvé")
    return crud.get_questions_by_exam(db, exam_id)

@router.get("/{exam_id}/contenu-brut")
async def exporter_contenu_brut(exam_id: int, db: Session = Depends(get_db)):
    from fastapi import Response
    
    examen = crud.get_exam(db, exam_id)
    if not examen:
        raise HTTPException(status_code=404, detail="Examen non trouvé")
    if not examen.contenu_brut:
        raise HTTPException(status_code=404, detail="Aucun contenu brut")
    return Response(
        content=examen.contenu_brut,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=examen_{exam_id}_brut.txt"}
    )