"""
EXAM SERVICE - Gestion des examens
Port: 8002
"""

from fastapi import FastAPI, Depends, Form, File, HTTPException, UploadFile, Response
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, get_db, Base
from . import models, schemas, crud
from .utils.pdf_utils import is_pdf_with_text, extract_text_from_pdf
from .utils.ocr_client import call_ocr_service
from .utils.exam_parser import parse_exam_text
from .dependencies import get_current_teacher
from .config import settings
import httpx
import logging

EXAM_NOT_FOUND = "Examen non trouvé"
QUESTION_NOT_FOUND = "Question non trouvée"
OCR_SERVICE_URL = settings.OCR_SERVICE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Exam Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"service": "Exam Service", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "exam-service"}


# ═══════════════════════════════════════════════════════
# EXAMENS — ROUTES STATIQUES EN PREMIER (avant /{exam_id})
# ═══════════════════════════════════════════════════════

@app.get("/exams", response_model=list[schemas.ExamResponse])
def read_exams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_all_exams(db, skip=skip, limit=limit)


@app.post("/exams/import")
async def import_exam(
    file: UploadFile = File(...),
    auto_create: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """
    Importe un examen depuis un fichier (PDF, image, texte)
    - auto_create=false : retourne un aperçu
    - auto_create=true  : crée directement en DB
    """
    try:
        logger.info(f"📥 Import: {file.filename} par enseignant {current_user['id']}")
        extension = file.filename.split('.')[-1].lower()

        # 1. EXTRAIRE LE TEXTE
        if extension == "pdf":
            if is_pdf_with_text(file):
                text = extract_text_from_pdf(file)
            else:
                text = await call_ocr_service(file)
        elif extension in ["jpg", "jpeg", "png"]:
            text = await call_ocr_service(file)
        elif extension == "txt":
            content = await file.read()
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1')
            await file.seek(0)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Format non supporté: {extension}. Utilisez PDF, JPG, PNG ou TXT"
            )

        # 2. ANALYSER
        parsed_data = parse_exam_text(text)

        exam_data = {
            "titre": parsed_data.get("titre", "Examen sans titre"),
            "description": parsed_data.get("description", ""),
            "matiere": parsed_data.get("matiere", "Général"),
            "id_enseignant": current_user["id"],
            "points_totaux": parsed_data.get("points_totaux", 20.0),
            "statut": "brouillon",
            "contenu_brut": text
        }
        questions_data = parsed_data.get("questions", [])

        response = {
            "success": True,
            "message": "Fichier traité avec succès",
            "filename": file.filename,
            "extension": extension,
            "teacher_id": current_user["id"],
            "preview": {
                "titre": exam_data["titre"],
                "matiere": exam_data["matiere"],
                "questions_count": len(questions_data),
                "points_totaux": exam_data["points_totaux"]
            },
            "extracted_text": text[:500] + ("..." if len(text) > 500 else "")
        }

        if auto_create:
            exam_create = schemas.ExamCreate(**exam_data)
            new_exam = crud.create_exam(db, exam_create)
            questions_created = 0
            for i, q in enumerate(questions_data):
                try:
                    q_create = schemas.QuestionCreate(
                        exam_id=new_exam.id,
                        texte=q["texte"],
                        points=q.get("points", 2),
                        type_question=q.get("type", "ouverte"),
                        ordre=q.get("ordre", i + 1)
                    )
                    crud.create_question(db, q_create)
                    questions_created += 1
                except Exception as e:
                    logger.error(f"Erreur création question: {e}")

            response["exam_created"] = {
                "id": new_exam.id,
                "titre": new_exam.titre,
                "date_creation": str(new_exam.date_creation),
                "questions_created": questions_created
            }
            response["message"] = f"Examen importé avec {questions_created} questions"

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur import: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/exams", response_model=schemas.ExamResponse)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    if exam.id_enseignant != current_user["id"]:
        raise HTTPException(status_code=403,
            detail="Vous ne pouvez créer un examen qu'avec votre propre ID")
    try:
        return crud.create_exam(db, exam)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════
# EXAMENS — ROUTES DYNAMIQUES /{exam_id}
# ═══════════════════════════════════════════════════════

@app.get("/exams/teacher/{teacher_id}", response_model=list[schemas.ExamResponse])
def read_exams_by_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    return crud.get_exams_by_teacher(db, teacher_id)


@app.get("/exams/{exam_id}", response_model=schemas.ExamResponse)
def read_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    return exam


@app.put("/exams/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(
    exam_id: int,
    exam: schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres examens")
    return crud.update_exam(db, exam_id, exam)


@app.delete("/exams/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres examens")
    if crud.delete_exam(db, exam_id):
        return {"message": "Examen supprimé avec succès"}
    return {"message": "Échec de la suppression"}


@app.put("/exams/{exam_id}/publish", response_model=schemas.ExamResponse)
def publish_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    existing = crud.get_exam(db, exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    if existing.id_enseignant != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez publier que vos propres examens")
    return crud.publish_exam(db, exam_id)


@app.get("/exams/{exam_id}/pdf")
async def exporter_examen_pdf(exam_id: int, db: Session = Depends(get_db)):
    """Export PDF via OCR service (pdflatex)"""
    examen = crud.get_exam(db, exam_id)
    if not examen:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)

    # Construire le texte à envoyer
    if examen.contenu_brut:
        texte = examen.contenu_brut
    else:
        # Examen créé manuellement → reconstruire depuis les questions
        questions_db = crud.get_questions_by_exam(db, exam_id)
        texte = f"{examen.titre}\nMatière : {examen.matiere}\nTotal : {examen.points_totaux} points\n\n"
        for i, q in enumerate(questions_db, 1):
            texte += f"Question {i} ({float(q.points or 1)} pts)\n{q.texte}\n\n"

    try:
        async with httpx.AsyncClient(timeout=400.0) as client:
            r = await client.post(
                f"{OCR_SERVICE_URL}/ocr/process-pdf",
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
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code,
            detail=f"Erreur OCR service: {e.response.text}")


@app.get("/exams/{exam_id}/contenu-brut")
async def exporter_contenu_brut(exam_id: int, db: Session = Depends(get_db)):
    examen = crud.get_exam(db, exam_id)
    if not examen:
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    if not examen.contenu_brut:
        raise HTTPException(status_code=404,
            detail="Aucun contenu brut. L'examen a été créé manuellement.")
    return Response(
        content=examen.contenu_brut,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=examen_{exam_id}_brut.txt"}
    )


@app.get("/exams/{exam_id}/questions", response_model=list[schemas.QuestionResponse])
def get_questions(exam_id: int, db: Session = Depends(get_db)):
    return crud.get_questions_by_exam(db, exam_id)


# ═══════════════════════════════════════════════════════
# QUESTIONS
# ═══════════════════════════════════════════════════════

@app.post("/questions", response_model=schemas.QuestionResponse)
def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    if not crud.get_exam(db, question.exam_id):
        raise HTTPException(status_code=404, detail=EXAM_NOT_FOUND)
    return crud.create_question(db, question)


@app.get("/questions/{question_id}", response_model=schemas.QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = crud.get_question(db, question_id)
    if not q:
        raise HTTPException(status_code=404, detail=QUESTION_NOT_FOUND)
    return q


@app.put("/questions/{question_id}", response_model=schemas.QuestionResponse)
def update_question(
    question_id: int,
    question: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    updated = crud.update_question(db, question_id, question)
    if not updated:
        raise HTTPException(status_code=404, detail=QUESTION_NOT_FOUND)
    return updated


@app.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    if not crud.delete_question(db, question_id):
        raise HTTPException(status_code=404, detail=QUESTION_NOT_FOUND)
    return {"message": "Question supprimée avec succès"}


@app.delete("/exams/{exam_id}/questions")
def delete_all_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    crud.delete_questions_by_exam(db, exam_id)
    return {"message": "Toutes les questions supprimées"}


# ═══════════════════════════════════════════════════════
# COPIES D'ÉTUDIANTS
# ═══════════════════════════════════════════════════════

@app.post("/copies/upload", response_model=schemas.CopieResponse)
async def upload_copy(
    file: UploadFile = File(...),
    exam_id: int = Form(...),
    student_id: int = Form(...),
    db: Session = Depends(get_db)
):
    try:
        extension = file.filename.split('.')[-1].lower()
        if extension == "pdf":
            text = extract_text_from_pdf(file) if is_pdf_with_text(file) \
                   else await call_ocr_service(file)
        else:
            text = await call_ocr_service(file)

        return crud.create_copie(db, schemas.CopieCreate(
            exam_id=exam_id,
            student_id=student_id,
            contenu_brut=text,
            reponses=None,
            note=None
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/copies/exam/{exam_id}", response_model=list[schemas.CopieResponse])
def get_exam_copies(exam_id: int, db: Session = Depends(get_db)):
    return crud.get_copies_by_exam(db, exam_id)


@app.get("/copies/student/{student_id}", response_model=list[schemas.CopieResponse])
def get_student_copies(student_id: int, db: Session = Depends(get_db)):
    return crud.get_copies_by_student(db, student_id)


@app.put("/copies/{copie_id}/note")
def update_copie_note(copie_id: int, note: float, db: Session = Depends(get_db)):
    updated = crud.update_copie_note(db, copie_id, note)
    if not updated:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    return {"message": "Note mise à jour", "note": note}


@app.get("/copies/{copie_id}/pdf")
async def exporter_copie_pdf(copie_id: int, db: Session = Depends(get_db)):
    copie = db.query(models.CopieEtudiant).filter(
        models.CopieEtudiant.id == copie_id
    ).first()
    if not copie:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    if not copie.contenu_brut:
        raise HTTPException(status_code=404, detail="Aucun contenu brut pour cette copie")

    try:
        async with httpx.AsyncClient(timeout=400.0) as client:
            r = await client.post(
                f"{OCR_SERVICE_URL}/ocr/process-pdf",
                files={"file": (f"copie_{copie_id}.txt",
                                copie.contenu_brut.encode("utf-8"), "text/plain")}
            )
            r.raise_for_status()
        return Response(
            content=r.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=copie_{copie_id}.pdf"}
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service OCR indisponible")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code,
            detail=f"Erreur OCR service: {e.response.text}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)