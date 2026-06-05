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

@app.get("/auth/test")
async def test_auth(current_user: dict = Depends(get_current_teacher)):
    """Endpoint de test pour vérifier que l'authentification fonctionne"""
    return {
        "message": "Authentification réussie !",
        "user": current_user
    }

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
        copie.reponses = reponses 
        db.commit()
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


from pydantic import BaseModel


@app.get("/corrections/copie/{copie_id}/details")
async def get_correction_details(copie_id: int, db: Session = Depends(get_db)):
    """Récupère tous les détails de correction pour une copie"""
    
    result = db.execute(
        text("""
            SELECT cd.*, q.texte as question_texte
            FROM exam.correction_details cd
            JOIN exam.questions q ON cd.question_id = q.id
            WHERE cd.copie_id = :copie_id
            ORDER BY q.ordre
        """),
        {"copie_id": copie_id}
    ).fetchall()
    
    return [dict(r._mapping) for r in result]
from pydantic import BaseModel

class CorrectionSaveRequest(BaseModel):
    question_id: int
    points_obtenus: float
    feedback: str = ""
    similarity_score: float = None

@app.post("/corrections/{copie_id}/save")
async def save_correction(
    copie_id: int,
    request: CorrectionSaveRequest,
    db: Session = Depends(get_db)
):
    """Sauvegarde une correction manuelle"""
    print(f"feedback = {request.feedback}")
    try:
        # Récupérer la question
        question = crud.get_question(db, request.question_id)
        if not question:
            raise HTTPException(404, f"Question {request.question_id} non trouvée")
        
        # Récupérer la copie
        copie = crud.get_copie(db, copie_id)
        
        # Récupérer la réponse de l'étudiant (depuis la copie ou depuis une table)
        reponse_etudiant = None
        if copie and copie.reponses:
            reponse_etudiant = copie.reponses.get(str(request.question_id))
        
        # Récupérer la bonne réponse
        bonne_reponse = question.reponse_correcte
        
        # Vérifier si la correction existe déjà
        result = db.execute(
            text("SELECT id FROM exam.correction_details WHERE copie_id = :copie_id AND question_id = :question_id"),
            {"copie_id": copie_id, "question_id": request.question_id}
        ).first()
        
        if result:
            # UPDATE avec TOUS les champs
            db.execute(
                text("""
                    UPDATE exam.correction_details 
                    SET points_obtenus = :points_obtenus,
                        feedback = :feedback,
                        similarity_score = :similarity_score,
                        correct = :correct,
                        reponse_etudiant = :reponse_etudiant,
                        bonne_reponse = :bonne_reponse
                    WHERE copie_id = :copie_id AND question_id = :question_id
                """),
                {
                    "copie_id": copie_id,
                    "question_id": request.question_id,
                    "points_obtenus": request.points_obtenus,
                    "feedback": request.feedback,
                    "similarity_score": request.similarity_score,
                    "correct": request.points_obtenus == question.points,
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": bonne_reponse
                }
            )
        else:
            # INSERT avec TOUS les champs
            db.execute(
                text("""
                    INSERT INTO exam.correction_details 
                    (copie_id, question_id, points_obtenus, points_possibles, 
                     correct, statut, feedback, similarity_score,
                     reponse_etudiant, bonne_reponse)
                    VALUES (:copie_id, :question_id, :points_obtenus, :points_possibles,
                            :correct, 'manuel', :feedback, :similarity_score,
                            :reponse_etudiant, :bonne_reponse)
                """),
                {
                    "copie_id": copie_id,
                    "question_id": request.question_id,
                    "points_obtenus": request.points_obtenus,
                    "points_possibles": float(question.points),
                    "correct": request.points_obtenus == question.points,
                    "feedback": request.feedback,
                    "similarity_score": request.similarity_score,
                    "reponse_etudiant": reponse_etudiant,
                    "bonne_reponse": bonne_reponse
                }
            )
        
        db.commit()
        return {"success": True}
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)