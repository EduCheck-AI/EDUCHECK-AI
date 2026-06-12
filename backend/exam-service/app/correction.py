"""
EXAM SERVICE - Gestion des examens
Port: 8002
"""

from fastapi import FastAPI, Depends, Form, File, HTTPException, UploadFile, Response
from fastapi.responses import FileResponse
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, get_db, Base
from . import models, schemas, crud
from .utils.pdf_utils import is_pdf_with_text, extract_text_from_pdf
from .utils.ocr_client import call_ocr_service
from .dependencies import get_current_teacher
from .config import settings
import httpx
import logging

from .correction import router as correction_router


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

app.include_router(correction_router, prefix="", tags=["corrections"])

@app.get("/")
async def root():
    return {"service": "Exam Service", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "exam-service"}

@app.post("/exams/debug-ocr-raw")
async def debug_ocr_raw(file: UploadFile = File(...)):
    """Affiche le texte OCR brut sans aucun traitement"""
    extension = file.filename.split('.')[-1].lower()
    
    if extension in ["jpg", "jpeg", "png"]:
        text = await call_ocr_service(file)
    else:
        content = await file.read()
        text = content.decode('utf-8')
    
    # Afficher les lignes une par une
    lines = text.split('\n')
    
    result = {
        "total_lines": len(lines),
        "lines": []
    }
    
    for i, line in enumerate(lines[:50]):  # 50 premières lignes
        result["lines"].append({
            "num": i + 1,
            "content": line,
            "has_A": 'A)' in line or 'A )' in line or 'A.' in line
        })
    
    return result
# ═══════════════════════════════════════════════════════
# EXAMENS — ROUTES STATIQUES EN PREMIER (avant /{exam_id})
# ═══════════════════════════════════════════════════════
@app.post("/exams/debug-ocr")
async def debug_ocr(file: UploadFile = File(...)):
    """Affiche le texte brut extrait par OCR pour debug"""
    try:
        extension = file.filename.split('.')[-1].lower()
        
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
            raise HTTPException(status_code=400, detail="Format non supporté")
        
        # Nettoyer et parser
        from .utils.exam_parser import nettoyer_texte_ocr, extraire_questions_ocr
        
        text_clean = nettoyer_texte_ocr(text)
        questions = extraire_questions_ocr(text)
        
        return {
            "original_text": text[:1000],
            "cleaned_text": text_clean[:1000],
            "questions_detected": len(questions),
            "questions": questions[:10]  # Les 10 premières questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

        # 2. ANALYSER AVEC GROQ (ASYNC) ← MODIFICATION ICI
        from .utils.exam_parser import parse_exam_text_with_groq
        
        parsed_data = await parse_exam_text_with_groq(text)  # ← await ajouté

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
            import json
    
            print(f"Nombre de questions à créer: {len(questions_data)}")
    
            exam_create = schemas.ExamCreate(**exam_data)
            new_exam = crud.create_exam(db, exam_create)
            questions_created = 0
    
            for i, q in enumerate(questions_data):
                print(f"\n--- Question {i+1} ---")
                print(f"  texte: {q.get('texte', '')[:50]}...")
                print(f"  type: {q.get('type')}")
                print(f"  reponse_correcte: {q.get('reponse_correcte')}")
        
                try:
                    reponse_correcte = None
                    if q.get("type") == "qcm" and q.get("reponse_correcte"):
                        reponse_correcte = json.dumps(q["reponse_correcte"], ensure_ascii=False)
                        print(f"  reponse_correcte JSON: {reponse_correcte[:100]}...")
            
                    q_create = schemas.QuestionCreate(
                        exam_id=new_exam.id,
                        texte=q["texte"],
                        points=q.get("points", 2),
                        type_question=q.get("type", "ouverte"),
                        ordre=q.get("ordre", i + 1),
                        reponse_correcte=reponse_correcte
                    )
            
                    print(f"  Création question avec exam_id={new_exam.id}")
                    result = crud.create_question(db, q_create)
                    print(f"  Question créée avec ID: {result.id}")
                    questions_created += 1
            
                except Exception as e:
                    print(f"  ERREUR: {type(e).__name__}: {e}")
                    import traceback
                    traceback.print_exc()
                    logger.error(f"Erreur création question {i}: {e}")

            print(f"\nTotal questions créées: {questions_created}")
            
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
        logger.error(f"Erreur import: {e}")
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
# COPIES D'ÉTUDIANTS - CORRECTION AUTOMATIQUE
# ═══════════════════════════════════════════════════════

@app.post("/copies/upload-et-corriger")
async def upload_et_corriger(
    file: UploadFile = File(...),
    exam_id: int = Form(...),
    student_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload d'une copie scannée + correction automatique
    """
    try:
        print("=" * 50)
        print("🔍 ROUTE upload-et-corriger appelée")
        print(f"   exam_id: {exam_id}")
        print(f"   student_id: {student_id}")
        print(f"   filename: {file.filename}")
        print("=" * 50)
        
        # 1. Vérifier que l'examen existe
        exam = crud.get_exam(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Examen non trouvé")
        print(f"Examen trouvé: {exam.titre}")
        
        # 2. Extraire le texte avec OCR
        extension = file.filename.split('.')[-1].lower()
        print(f"Extension: {extension}")
        
        if extension == "pdf":
            if is_pdf_with_text(file):
                text = extract_text_from_pdf(file)
                print(f"Texte extrait du PDF: {len(text)} caractères")
            else:
                print("PDF sans texte, appel OCR...")
                text = await call_ocr_service(file)
                print(f"OCR terminé: {len(text)} caractères")
        else:
            print("Appel OCR...")
            text = await call_ocr_service(file)
            print(f"OCR terminé: {len(text)} caractères")
        
        # 3. Créer la copie
        copie = crud.create_copie(db, schemas.CopieCreate(
            exam_id=exam_id,
            student_id=student_id,
            contenu_brut=text,
            reponses=None,
            note=None
        ))
        print(f"Copie créée avec ID: {copie.id}")
        
        # 4. Récupérer les questions
        questions = crud.get_questions_by_exam(db, exam_id)
        print(f"{len(questions)} questions récupérées")
        
        # 5. Extraire les réponses
        from .correction import extraire_reponses_ocr, corriger_examen
        
        reponses = await extraire_reponses_ocr(text, questions)
        print(f"📝 Réponses extraites: {len(reponses)}")
        
        # 6. Corriger
        resultat = await corriger_examen(questions, reponses, db, copie.id)
        print(f"Correction terminée: {resultat['note']}/{resultat['total']} pts")
        
        # 7. Mettre à jour la note
        db.query(models.CopieEtudiant).filter(
            models.CopieEtudiant.id == copie.id
        ).update({"note": resultat["note"]})
        db.commit()
        
        return {
            "copie_id": copie.id,
            "exam_id": exam_id,
            "student_id": student_id,
            "reponses_extraites": reponses,
            **resultat
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 50)
        print("ERREUR DETAILLEE:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
@app.post("/copies/batch-upload")
async def batch_upload_copies(
    files: list[UploadFile] = File(...),
    exam_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Import multiple de copies (batch upload)
    """
    results = []
    
    for idx, file in enumerate(files):
        try:
            # OCR
            extension = file.filename.split('.')[-1].lower()
            if extension == "pdf":
                if is_pdf_with_text(file):
                    text = extract_text_from_pdf(file)
                else:
                    text = await call_ocr_service(file)
            else:
                text = await call_ocr_service(file)
            
            # Extraire student_id du nom de fichier ou par défaut
            student_id = idx + 1
            import re
            match = re.search(r'(\d+)', file.filename)
            if match:
                student_id = int(match.group(1))
            
            # Créer copie
            copie = crud.create_copie(db, schemas.CopieCreate(
                exam_id=exam_id,
                student_id=student_id,
                contenu_brut=text,
                reponses=None,
                note=None
            ))
            
            results.append({
                "filename": file.filename,
                "copie_id": copie.id,
                "status": "success"
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "exam_id": exam_id,
        "total": len(files),
        "success_count": len([r for r in results if r["status"] == "success"]),
        "results": results
    }

# ═══════════════════════════════════════════════════════
# CORRECTION MANUELLE
# ═══════════════════════════════════════════════════════

@app.post("/corrections/{copie_id}/save")
async def save_correction(
    copie_id: int,
    question_id: int = Form(...),
    points_obtenus: float = Form(...),
    feedback: str = Form(...),
    db: Session = Depends(get_db)
):
    """Sauvegarde une correction manuelle"""
    try:
        # Récupérer la question pour les points max
        question = crud.get_question(db, question_id)
        
        # Vérifier si la correction existe
        result = db.execute(
            text("""
                SELECT * FROM exam.correction_details 
                WHERE copie_id = :copie_id AND question_id = :question_id
            """),
            {"copie_id": copie_id, "question_id": question_id}
        ).first()
        
        if result:
            # Mettre à jour
            db.execute(
                text("""
                    UPDATE exam.correction_details 
                    SET points_obtenus = :points_obtenus, 
                        feedback = :feedback,
                        correct = :correct
                    WHERE copie_id = :copie_id AND question_id = :question_id
                """),
                {
                    "copie_id": copie_id,
                    "question_id": question_id,
                    "points_obtenus": points_obtenus,
                    "feedback": feedback,
                    "correct": points_obtenus == question.points
                }
            )
        else:
            # Créer
            db.execute(
                text("""
                    INSERT INTO exam.correction_details 
                    (copie_id, question_id, points_obtenus, points_possibles, correct, feedback, statut)
                    VALUES (:copie_id, :question_id, :points_obtenus, :points_possibles, :correct, :feedback, 'manuel')
                """),
                {
                    "copie_id": copie_id,
                    "question_id": question_id,
                    "points_obtenus": points_obtenus,
                    "points_possibles": float(question.points),
                    "correct": points_obtenus == question.points,
                    "feedback": feedback
                }
            )
        
        db.commit()
        return {"success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/corrections/copie/{copie_id}")
async def get_corrections_by_copie(copie_id: int, db: Session = Depends(get_db)):
    """Récupère toutes les corrections d'une copie"""
    try:
        result = db.execute(
            text("""
                SELECT * FROM exam.correction_details 
                WHERE copie_id = :copie_id
            """),
            {"copie_id": copie_id}
        ).fetchall()
        
        return [dict(r._mapping) for r in result]
        
    except Exception as e:
        # Table peut ne pas exister encore
        return []

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

@app.get("/copies/{copie_id}/export/pdf")
async def export_copie_pdf(copie_id: int, db: Session = Depends(get_db)):
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")
    
    output_path = f"reports/copie_{copie_id}.pdf"
    # ... génération du PDF
    return FileResponse(output_path, media_type="application/pdf", filename=f"rapport_copie_{copie_id}.pdf")

from pydantic import BaseModel

class NoteUpdate(BaseModel):
    note: float

@app.put("/copies/{copie_id}/note")
def update_copie_note(copie_id: int, request: NoteUpdate, db: Session = Depends(get_db)):
    updated = crud.update_copie_note(db, copie_id, request.note)
    if not updated:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    return {"message": "Note mise à jour", "note": request.note}

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


import json
import csv
import re
import os
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from .database import get_db
from datetime import datetime
from . import crud, models
from app import schemas
from .utils.ocr_client import call_ocr_service
import httpx

os.makedirs("reports", exist_ok=True)
router = APIRouter()

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY", "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"
)
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# ============================================================
# CORRECTION PAR GROQ AVEC RÉFÉRENCE
# ============================================================


async def groq_corriger(
    question: str,
    reponse_etudiant: str,
    reponse_correcte: str,
    points: float,
    type_q: str,
) -> dict:
    """Correction universelle via Groq avec réponse de référence"""

    if type_q == "calcul":
        contexte = """Tu es un correcteur mathématique/informatique expert.
Accepte toutes les formes équivalentes (ex: 2+2=4, x**2=x^2, print("hi")=print('hi')).
Pour le code : vérifie la logique, pas la syntaxe exacte."""
    else:
        contexte = """Tu es un correcteur d'examen expert, toutes matières confondues.
Sois juste et pédagogique."""

    prompt = f"""{contexte}

Question : {question}
Réponse correcte : {reponse_correcte}
Réponse étudiant : {reponse_etudiant}
Points disponibles : {points}
Type : {type_q}

Retourne UNIQUEMENT ce JSON :
{{
  "points_obtenus": <nombre entre 0 et {points}>,
  "pourcentage": <nombre entre 0 et 100>,
  "correct": <true/false>,
  "feedback": "<explication en français>"
}}"""

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 0,
            },
        )
    content = r.json()["choices"][0]["message"]["content"].strip()
    content = re.sub(r"```json\n?|```", "", content).strip()
    return json.loads(content)


# ============================================================
# CORRECTION PAR GROQ SANS RÉFÉRENCE (NOUVEAU)
# ============================================================


async def groq_corriger_sans_reference(
    question: str, reponse_etudiant: str, points: float
) -> dict:
    """Correction par IA sans réponse de référence (quand le prof n'a pas saisi de réponse)"""

    prompt = f"""
Tu es un correcteur d'examen expert, toutes matières confondues.

Question : {question}
Réponse de l'étudiant : {reponse_etudiant}
Points disponibles : {points}

Évalue la réponse de l'étudiant UNIQUEMENT en fonction de sa pertinence, sa justesse et sa complétude.
Tu n'as pas de réponse de référence, donc tu dois juger par toi-même si la réponse est correcte.

Retourne UNIQUEMENT ce JSON :
{{
  "points_obtenus": <nombre entre 0 et {points}>,
  "pourcentage": <nombre entre 0 et 100>,
  "correct": <true/false>,
  "feedback": "<explication en français>"
}}

Barème approximatif :
- 100% : réponse parfaite, complète et précise
- 70-99% : bonne réponse avec quelques imprécisions
- 40-69% : réponse partiellement correcte
- 10-39% : réponse dans la bonne direction mais incomplète
- 0-9% : réponse incorrecte ou hors sujet

Sois juste et pédagogique.
"""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 0,
            },
        )
    content = r.json()["choices"][0]["message"]["content"].strip()
    content = re.sub(r"```json\n?|```", "", content).strip()
    return json.loads(content)


# ============================================================
# HELPERS
# ============================================================


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


def parse_reponses(raw) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except:
        return {}


# ============================================================
# CORRECTION QCM
# ============================================================


def corriger_qcm(questions_exam: list, reponses_etudiant: dict) -> dict:
    note_obtenue = 0.0
    total_possible = 0.0
    details = []

    for question in questions_exam:
        if question.type_question != "qcm":
            continue
        try:
            data = json.loads(question.reponse_correcte or "{}")
            choix = data.get("choix", [])
            bonne_reponse_idx = data.get("bonne_reponse", 0)
        except:
            continue

        points_question = float(question.points or 1)
        total_possible += points_question
        reponse_idx = reponses_etudiant.get(str(question.id))

        # Vérifier si la réponse est valide
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
            # Convertir en entier
            try:
                reponse_idx = int(reponse_idx)
            except (ValueError, TypeError):
                reponse_idx = -1

            # Vérifier si l'index est valide
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
                # Index invalide (ex: réponse 5 alors qu'il n'y a que 4 choix)
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
    return {
        "note": round(note_obtenue, 2),
        "total": round(total_possible, 2),
        "pourcentage": pourcentage,
        "mention": get_mention(pourcentage),
        "details": details,
    }


# ============================================================
# CORRECTION AVEC GROQ (ouvertes + calculs)
# ============================================================


async def corriger_avec_groq(
    questions_exam: list, reponses_etudiant: dict, type_q: str
) -> dict:
    note_obtenue = 0.0
    total_possible = 0.0
    details = []

    for question in questions_exam:
        if question.type_question != type_q:
            continue

        points_question = float(question.points or 1)
        total_possible += points_question
        reponse_etudiant = str(reponses_etudiant.get(str(question.id), "")).strip()

        if not reponse_etudiant:
            details.append(
                {
                    "question_id": question.id,
                    "texte": question.texte[:80],
                    "points_question": points_question,
                    "points_obtenus": 0,
                    "reponse_etudiant": None,
                    "bonne_reponse": question.reponse_correcte or "Non spécifiée",
                    "correct": False,
                    "statut": "non_repondu",
                    "feedback": "Aucune réponse fournie.",
                }
            )
            continue

        try:
            # 🔥 NOUVEAU : Si pas de réponse correcte, l'IA corrige sans référence
            if not question.reponse_correcte:
                result = await groq_corriger_sans_reference(
                    question.texte, reponse_etudiant, points_question
                )
            else:
                result = await groq_corriger(
                    question.texte,
                    reponse_etudiant,
                    question.reponse_correcte,
                    points_question,
                    type_q,
                )

            points_obtenus = min(
                float(result.get("points_obtenus", 0)), points_question
            )
            correct = bool(result.get("correct", False))
            note_obtenue += points_obtenus

            details.append(
                {
                    "question_id": question.id,
                    "texte": question.texte[:80],
                    "points_question": points_question,
                    "points_obtenus": round(points_obtenus, 2),
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": question.reponse_correcte or "Évalué par IA",
                    "correct": correct,
                    "statut": "correct" if correct else "incorrect",
                    "similarity_score": result.get("pourcentage", 0),
                    "feedback": result.get("feedback", ""),
                }
            )
        except Exception as e:
            details.append(
                {
                    "question_id": question.id,
                    "texte": question.texte[:80],
                    "points_question": points_question,
                    "points_obtenus": 0,
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": question.reponse_correcte or "Non spécifiée",
                    "correct": False,
                    "statut": "erreur",
                    "feedback": f"Erreur correction: {str(e)}",
                }
            )

    return {
        "note": round(note_obtenue, 2),
        "total": round(total_possible, 2),
        "details": details,
    }


# ============================================================
# CORRECTION COMPLÈTE D'UN EXAMEN
# ============================================================


async def corriger_examen(
    questions_exam: list,
    reponses_etudiant: dict,
    db: Session = None,
    copie_id: int = None,
) -> dict:
    resultat_qcm = corriger_qcm(questions_exam, reponses_etudiant)
    resultat_ouvertes = await corriger_avec_groq(
        questions_exam, reponses_etudiant, "ouverte"
    )
    resultat_calculs = await corriger_avec_groq(
        questions_exam, reponses_etudiant, "calcul"
    )

    note_totale = (
        resultat_qcm["note"] + resultat_ouvertes["note"] + resultat_calculs["note"]
    )
    total_possible = (
        resultat_qcm["total"] + resultat_ouvertes["total"] + resultat_calculs["total"]
    )
    details = (
        resultat_qcm["details"]
        + resultat_ouvertes["details"]
        + resultat_calculs["details"]
    )
    pourcentage = (
        round(note_totale / total_possible * 100, 1) if total_possible > 0 else 0
    )

    # Sauvegarde en DB si fournie
    if db and copie_id:
        # Vérifier si le modèle CorrectionDetail existe
        if hasattr(models, "CorrectionDetail"):
            db.query(models.CorrectionDetail).filter(
                models.CorrectionDetail.copie_id == copie_id
            ).delete()
            db.commit()
            for detail in details:
                # Créer l'objet de correction
                correction_data = {
                    "copie_id": copie_id,
                    "question_id": detail["question_id"],
                    "reponse_etudiant": detail.get("reponse_etudiant"),
                    "bonne_reponse": detail.get("bonne_reponse"),
                    "points_obtenus": detail["points_obtenus"],
                    "points_possibles": detail["points_question"],
                    "correct": detail["correct"],
                    "statut": detail["statut"],
                    "feedback": detail.get("feedback", ""),
                    "similarity_score": detail.get("similarity_score"),
                }
                # Utiliser la fonction appropriée
                if hasattr(crud, "create_correction_detail"):
                    crud.create_correction_detail(db, correction_data)
        else:
            # Modèle CorrectionDetail n'existe pas - on ignore la sauvegarde
            print("⚠️ CorrectionDetail model not found, skipping DB save")

    return {
        "note": round(note_totale, 2),
        "total": round(total_possible, 2),
        "pourcentage": pourcentage,
        "mention": get_mention(pourcentage),
        "details": details,
    }


# ============================================================
# EXTRACTION DES RÉPONSES PAR OCR
# ============================================================


async def extraire_reponses_ocr(texte_ocr: str, questions: list) -> dict:
    """Extrait les réponses depuis le texte OCR"""
    reponses = {}
    lettres_qcm = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    lignes = texte_ocr.split("\n")

    qcm_questions = [q for q in questions if q.type_question == "qcm"]
    autres_questions = [
        q for q in questions if q.type_question in ("ouverte", "calcul")
    ]

    # 1. Extraction QCM
    for i, question in enumerate(qcm_questions):
        for ligne in lignes:
            patterns = [
                rf"{i+1}[\.\)\s:]*([A-F])",
                rf"Q{i+1}[\.\)\s:]*([A-F])",
                rf"question\s*{i+1}[\.\)\s:]*([A-F])",
            ]
            for pattern in patterns:
                match = re.search(pattern, ligne, re.IGNORECASE)
                if match:
                    lettre = match.group(1).upper()
                    if lettre in lettres_qcm:
                        reponses[str(question.id)] = lettres_qcm[lettre]
                        break
            if str(question.id) in reponses:
                break

    # 2. Extraction simple pour les autres questions
    for i, question in enumerate(autres_questions):
        for j, ligne in enumerate(lignes):
            if re.search(rf"^{i+1}[\.\)\s:]", ligne.strip()):
                # Prendre le contenu après le numéro
                reponse = re.sub(rf"^{i+1}[\.\)\s:]*", "", ligne).strip()
                if reponse:
                    reponses[str(question.id)] = reponse
                    break
            elif j > 0 and i < len(lignes) - 1:
                # Chercher des mots-clés
                mots = question.texte.lower().split()[:3]
                if any(mot in ligne.lower() for mot in mots):
                    reponses[str(question.id)] = ligne.strip()
                    break

    return reponses


# ============================================================
# ROUTES API
# ============================================================


@router.post("/copies/{copie_id}/corriger")
async def corriger_copie(copie_id: int, db: Session = Depends(get_db)):
    """Corrige une copie existante"""
    copie = (
        db.query(models.CopieEtudiant)
        .filter(models.CopieEtudiant.id == copie_id)
        .first()
    )
    if not copie:
        raise HTTPException(404, "Copie non trouvée")

    questions = crud.get_questions_by_exam(db, copie.exam_id)

    if copie.reponses:
        reponses = parse_reponses(copie.reponses)
    else:
        reponses = await extraire_reponses_ocr(copie.contenu_brut or "", questions)

    resultat = await corriger_examen(questions, reponses, db, copie_id)

    # Mettre à jour la note
    db.query(models.CopieEtudiant).filter(models.CopieEtudiant.id == copie_id).update(
        {"note": resultat["note"]}
    )
    db.commit()

    return {
        "copie_id": copie_id,
        "exam_id": copie.exam_id,
        "student_id": copie.student_id,
        **resultat,
    }


@router.post("/exams/{exam_id}/soumettre")
async def soumettre_reponses(
    exam_id: int,
    student_id: int = Form(...),
    reponses: str = Form(...),
    db: Session = Depends(get_db),
):
    """Soumission des réponses via formulaire web"""
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    if exam.statut != "publié":
        raise HTTPException(400, "Cet examen n'est pas publié")

    reponses_dict = parse_reponses(reponses)

    copie = crud.create_copie(
        db,
        schemas.CopieCreate(
            exam_id=exam_id,
            student_id=student_id,
            contenu_brut="Soumission web",
            reponses=reponses_dict,
            note=None,
        ),
    )

    questions = crud.get_questions_by_exam(db, exam_id)
    resultat = await corriger_examen(questions, reponses_dict, db, copie.id)

    db.query(models.CopieEtudiant).filter(models.CopieEtudiant.id == copie.id).update(
        {"note": resultat["note"]}
    )
    db.commit()

    return {
        "copie_id": copie.id,
        "exam_id": exam_id,
        "student_id": student_id,
        **resultat,
    }


from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime
import os


@router.get("/copies/{copie_id}/export/pdf")
async def export_copie_pdf(copie_id: int, db: Session = Depends(get_db)):
    """Export PDF d'une copie corrigée"""

    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")

    exam = crud.get_exam(db, copie.exam_id)

    os.makedirs("reports", exist_ok=True)
    output_path = f"reports/copie_{copie_id}.pdf"

    # Créer un vrai PDF
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # Logo / Titre
    c.setFont("Helvetica-Bold", 18)
    c.drawString(2 * cm, height - 2 * cm, "EduCheck AI")
    c.setFont("Helvetica", 12)
    c.drawString(2 * cm, height - 3 * cm, "Rapport de correction automatique")

    # Ligne séparatrice
    c.line(2 * cm, height - 3.5 * cm, width - 2 * cm, height - 3.5 * cm)

    # Informations
    y = height - 5 * cm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2 * cm, y, "Informations générales :")

    c.setFont("Helvetica", 11)
    c.drawString(2 * cm, y - 0.8 * cm, f"Copie ID : {copie_id}")
    c.drawString(2 * cm, y - 1.6 * cm, f"Étudiant ID : {copie.student_id}")
    c.drawString(2 * cm, y - 2.4 * cm, f"Examen : {exam.titre if exam else 'N/A'}")
    c.drawString(
        2 * cm, y - 3.2 * cm, f"Date : {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
    )

    # Note
    c.setFont("Helvetica-Bold", 14)
    note = copie.note if copie.note else 0
    total = exam.points_totaux if exam else 20
    c.setFillColorRGB(0.2, 0.6, 0.2)  # Vert
    c.drawString(2 * cm, y - 4.5 * cm, f"Note : {note} / {total} pts")

    # Sauvegarde
    c.save()

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"rapport_copie_{copie_id}.pdf",
    )


@router.get("/copies/{copie_id}/export/csv")
async def export_copie_csv(copie_id: int, db: Session = Depends(get_db)):
    """Export CSV d'une copie corrigée"""
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")

    correction_details = []
    if hasattr(crud, "get_correction_details_by_copie"):
        correction_details = crud.get_correction_details_by_copie(db, copie_id)

    output_path = f"reports/copie_{copie_id}.csv"

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["Question", "Votre Réponse", "Bonne Réponse", "Points", "Feedback"]
        )

        for d in correction_details:
            writer.writerow(
                [
                    d.get("texte", "")[:60],
                    d.get("reponse_etudiant", ""),
                    d.get("bonne_reponse", ""),
                    f"{d.get('points_obtenus', 0)}/{d.get('points_possibles', 0)}",
                    d.get("feedback", ""),
                ]
            )

    return FileResponse(
        output_path, media_type="text/csv", filename=f"rapport_copie_{copie_id}.csv"
    )


@router.get("/copies/{copie_id}/export/json")
async def export_copie_json(copie_id: int, db: Session = Depends(get_db)):
    """Export JSON d'une copie corrigée"""
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")

    exam = crud.get_exam(db, copie.exam_id)

    correction_details = []
    if hasattr(crud, "get_correction_details_by_copie"):
        correction_details = crud.get_correction_details_by_copie(db, copie_id)

    return JSONResponse(
        content={
            "exam": {
                "id": exam.id,
                "titre": exam.titre,
                "matiere": exam.matiere,
                "points_totaux": float(exam.points_totaux),
            },
            "student_id": copie.student_id,
            "note": float(copie.note) if copie.note else 0,
            "details": [
                {
                    "question_id": d.get("question_id"),
                    "reponse_etudiant": d.get("reponse_etudiant"),
                    "bonne_reponse": d.get("bonne_reponse"),
                    "points_obtenus": float(d.get("points_obtenus", 0)),
                    "points_possibles": float(d.get("points_possibles", 0)),
                    "correct": d.get("correct", False),
                    "feedback": d.get("feedback", ""),
                }
                for d in correction_details
            ],
        }
    )


@router.get("/exams/{exam_id}/export/class/csv")
async def export_class_results_csv(exam_id: int, db: Session = Depends(get_db)):
    """Export CSV des résultats de toute la classe"""
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(404, "Examen non trouvé")

    copies = crud.get_copies_by_exam(db, exam_id)

    output_path = f"reports/class_results_exam_{exam_id}.csv"

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Étudiant ID", "Note", "Pourcentage", "Date de soumission"])

        for c in copies:
            note = float(c.note) if c.note else 0
            total = float(exam.points_totaux) if exam.points_totaux else 1
            pourcentage = f"{(note/total*100):.2f}%"
            date = (
                c.date_soumission.strftime("%d/%m/%Y %H:%M")
                if c.date_soumission
                else "N/A"
            )

            writer.writerow([c.student_id, note, pourcentage, date])

    return FileResponse(
        output_path,
        media_type="text/csv",
        filename=f"resultats_classe_exam_{exam_id}.csv",
    )


@router.get("/student/{student_id}/results")
async def get_student_results(student_id: int, db: Session = Depends(get_db)):
    """Récupère tous les résultats d'un étudiant"""
    copies = crud.get_copies_by_student(db, student_id)

    results = []
    for copie in copies:
        exam = crud.get_exam(db, copie.exam_id)
        total = float(exam.points_totaux) if exam and exam.points_totaux else 1
        note = float(copie.note) if copie.note else 0

        results.append(
            {
                "id": copie.id,
                "exam_id": copie.exam_id,
                "exam_title": exam.titre if exam else f"Examen #{copie.exam_id}",
                "matiere": exam.matiere if exam else "Non spécifiée",
                "score": note,
                "max_score": total,
                "percentage": round((note / total * 100), 1),
                "date": copie.date_soumission,
            }
        )

    return results


# ============================================================
# ROUTE IA POUR CORRECTION AUTOMATIQUE
# ============================================================


class CorrectionIARequest(BaseModel):
    question_id: int
    question_texte: str
    reponse_etudiant: str
    points: float
    type_question: str
    reponse_attendue: Optional[str] = None


@router.post("/corrections/ia")
async def correction_ia(request: CorrectionIARequest, db: Session = Depends(get_db)):
    """Correction automatique par IA"""

    print(f"📥 Requête reçue: {request}")

    try:
        if request.reponse_attendue and request.reponse_attendue.strip():
            result = await groq_corriger(
                request.question_texte,
                request.reponse_etudiant,
                request.reponse_attendue,
                request.points,
                request.type_question,
            )
        else:
            result = await groq_corriger_sans_reference(
                request.question_texte, request.reponse_etudiant, request.points
            )

        return {
            "points_obtenus": result.get("points_obtenus", 0),
            "pourcentage": result.get("pourcentage", 0),
            "correct": result.get("correct", False),
            "feedback": result.get("feedback", "Correction effectuée"),
        }
    except Exception as e:
        print(f"❌ Erreur IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)