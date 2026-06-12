from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import httpx
import re

from ..database import get_db
from .. import schemas, crud
from ..dependencies import get_current_teacher, get_current_user
from ..utils.pdf_utils import is_pdf_with_text, extract_text_from_pdf
from ..utils.ocr_client import call_ocr_service

router = APIRouter(prefix="/copies", tags=["Copies"])

class NoteUpdate(BaseModel):
    note: float

# ========== FONCTIONS UTILITAIRES ==========

async def extraire_reponses_ocr(texte_ocr: str, questions: list) -> dict:
    """Extrait les réponses depuis le texte OCR, avec fallback intelligent"""
    reponses = {}
    lettres_qcm = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    lignes = texte_ocr.split("\n") if texte_ocr else []
    
    # Si texte OCR vide
    if not texte_ocr or len(texte_ocr.strip()) < 10:
        print("⚠️ Texte OCR vide ou trop court")
        for question in questions:
            reponses[str(question.id)] = ""
        return reponses
    
    qcm_questions = [q for q in questions if q.type_question == "qcm"]
    autres_questions = [q for q in questions if q.type_question in ("ouverte", "calcul")]

    # 1. Extraction QCM
    for i, question in enumerate(qcm_questions):
        trouve = False
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
                        trouve = True
                        break
                if trouve:
                    break
            if trouve:
                break
        if not trouve:
            reponses[str(question.id)] = None  # Marquer comme non répondue

    # 2. Extraction questions ouvertes/calculs
    for i, question in enumerate(autres_questions):
        trouve = False
        for j, ligne in enumerate(lignes):
            # Pattern pour "1. Réponse"
            if re.search(rf"^{i+1}[\.\)\s:]", ligne.strip()):
                reponse = re.sub(rf"^{i+1}[\.\)\s:]*", "", ligne).strip()
                if reponse and len(reponse) > 2:  # Éviter les réponses trop courtes
                    reponses[str(question.id)] = reponse
                    trouve = True
                    break
        
        if not trouve:
            # Chercher des mots-clés de la question dans le texte
            mots_cles = question.texte.lower().split()[:5]
            for ligne in lignes:
                if any(mot in ligne.lower() for mot in mots_cles):
                    # Prendre la ligne comme réponse potentielle
                    if len(ligne.strip()) > 10:
                        reponses[str(question.id)] = ligne.strip()
                        trouve = True
                        break
        
        if not trouve:
            reponses[str(question.id)] = ""  # Réponse vide
    
    # Afficher un résumé des réponses extraites
    print(f"📝 Réponses extraites: {len([r for r in reponses.values() if r])}/{len(questions)} trouvées")
    
    return reponses


async def corriger_avec_gateway(copie_id: int, questions: list, reponses: dict) -> dict:
    AI_GATEWAY_URL = "http://localhost:8014"
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{AI_GATEWAY_URL}/ai/correct",
            json={
                "copie_id": copie_id,
                "questions_exam": [
                    {
                        "id": q.id,
                        "texte": q.texte,
                        "points": float(q.points),
                        "type_question": q.type_question,
                        "reponse_correcte": q.reponse_correcte,
                    }
                    for q in questions
                ],
                "reponses_etudiant": reponses,
            },
        )
        response.raise_for_status()
        return response.json()

# ========== ROUTES ==========

@router.post("/upload", response_model=schemas.CopieResponse)
async def upload_copy(
    file: UploadFile = File(...),
    exam_id: int = Form(...),
    student_id: int = Form(...),
    db: Session = Depends(get_db),
):
    try:
        extension = file.filename.split(".")[-1].lower()
        if extension == "pdf":
            text = (
                extract_text_from_pdf(file)
                if is_pdf_with_text(file)
                else await call_ocr_service(file)
            )
        else:
            text = await call_ocr_service(file)
        return crud.create_copie(
            db,
            schemas.CopieCreate(
                exam_id=exam_id,
                student_id=student_id,
                contenu_brut=text,
                reponses=None,
                note=None,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-et-corriger")
async def upload_et_corriger(
    file: UploadFile = File(...),
    exam_id: int = Form(...),
    student_name: str = Form(...),
    student_email: str = Form(None),
    db: Session = Depends(get_db),
):
    try:
        print("=" * 50)
        print("🔍 ROUTE upload-et-corriger appelée")
        print(f"   exam_id: {exam_id}, student_name: {student_name}, filename: {file.filename}")
        if student_email:
            print(f"   📧 Email: {student_email}")

        exam = crud.get_exam(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Examen non trouvé")

        extension = file.filename.split(".")[-1].lower()
        if extension == "pdf":
            if is_pdf_with_text(file):
                text = extract_text_from_pdf(file)
            else:
                text = await call_ocr_service(file)
        else:
            text = await call_ocr_service(file)
        
        student_id = hash(student_name) % 1000
        
        copie = crud.create_copie(
            db,
            schemas.CopieCreate(
                exam_id=exam_id,
                student_id=student_id,
                student_name=student_name,
                contenu_brut=text,
                reponses=None,
                note=None,
            ),
        )

        questions = crud.get_questions_by_exam(db, exam_id)
        reponses = await extraire_reponses_ocr(text, questions)
        copie.reponses = reponses
        db.commit()

        resultat = await corriger_avec_gateway(copie.id, questions, reponses)

        copie.note = resultat["note"]
        db.commit()

        # Notification par email
        if student_email:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    pourcentage = (resultat["note"] / resultat["total"]) * 100 if resultat["total"] > 0 else 0
                    await client.post(
                        "http://localhost:8004/notifications/email/resultat",
                        json={
                            "to_email": student_email,
                            "student_name": student_name,
                            "exam_title": exam.titre,
                            "note": resultat["note"],
                            "total": resultat["total"],
                            "pourcentage": round(pourcentage, 1),
                            "feedback_url": f"http://localhost:3000/corrections/{copie.id}"
                        }
                    )
                    print(f"📧 Email envoyé à {student_email}")
            except Exception as e:
                print(f"⚠️ Erreur envoi email: {e}")

        return {
            "copie_id": copie.id,
            "exam_id": exam_id,
            "student_id": student_id,
            **resultat,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/batch-upload")
async def batch_upload_copies(
    files: list[UploadFile] = File(...),
    exam_id: int = Form(...),
    student_names: str = Form(...),
    student_emails: str = Form("[]"),
    db: Session = Depends(get_db)
):
    import json
    
    print("=" * 50)
    print("📦 BATCH UPLOAD - Upload multiple")
    print(f"   exam_id: {exam_id}")
    print(f"   nombre de fichiers: {len(files)}")
    print("=" * 50)
    
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examen non trouvé")
    
    try:
        names_list = json.loads(student_names)
    except:
        names_list = [f"Étudiant_{i+1}" for i in range(len(files))]
    
    try:
        emails_list = json.loads(student_emails)
    except:
        emails_list = ["" for i in range(len(files))]
    
    results = []
    
    for idx, file in enumerate(files):
        student_name = names_list[idx] if idx < len(names_list) else f"Étudiant_{idx+1}"
        student_email = emails_list[idx] if idx < len(emails_list) else ""
        
        try:
            print(f"\n📥 {idx+1}/{len(files)}: {file.filename} → {student_name}")
            
            extension = file.filename.split('.')[-1].lower()
            if extension == "pdf":
                if is_pdf_with_text(file):
                    text = extract_text_from_pdf(file)
                else:
                    text = await call_ocr_service(file)
            else:
                text = await call_ocr_service(file)
            
            student_id = abs(hash(student_name)) % 10000
            
            copie = crud.create_copie(db, schemas.CopieCreate(
                exam_id=exam_id,
                student_id=student_id,
                student_name=student_name,
                contenu_brut=text,
                reponses=None,
                note=None
            ))
            
            questions = crud.get_questions_by_exam(db, exam_id)
            reponses = await extraire_reponses_ocr(text, questions)
            copie.reponses = reponses
            db.commit()
            
            resultat = await corriger_avec_gateway(copie.id, questions, reponses)
            
            copie.note = resultat["note"]
            db.commit()
            
            if student_email and student_email.strip():
                try:
                    pourcentage = (resultat["note"] / resultat["total"]) * 100 if resultat["total"] > 0 else 0
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        await client.post(
                            "http://localhost:8004/notifications/email/resultat",
                            json={
                                "to_email": student_email,
                                "student_name": student_name,
                                "exam_title": exam.titre,
                                "note": resultat["note"],
                                "total": resultat["total"],
                                "pourcentage": round(pourcentage, 1),
                                "feedback_url": f"http://localhost:3000/corrections/{copie.id}"
                            }
                        )
                        print(f"   📧 Email envoyé à {student_email}")
                except Exception as e:
                    print(f"   ⚠️ Erreur email: {e}")
            
            results.append({
                "filename": file.filename,
                "student_name": student_name,
                "status": "success",
                "copie_id": copie.id,
                "note": resultat["note"],
                "total": resultat["total"],
                "pourcentage": resultat["pourcentage"]
            })
            
        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")
            results.append({
                "filename": file.filename,
                "student_name": student_name,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "exam_id": exam_id,
        "total": len(files),
        "success_count": len([r for r in results if r["status"] == "success"]),
        "results": results
    }

@router.get("/exam/{exam_id}", response_model=list[schemas.CopieResponse])
def get_exam_copies(exam_id: int, db: Session = Depends(get_db)):
    return crud.get_copies_by_exam(db, exam_id)

@router.get("/student/{student_id}", response_model=list[schemas.CopieResponse])
def get_student_copies(student_id: int, db: Session = Depends(get_db)):
    return crud.get_copies_by_student(db, student_id)

@router.get("/{copie_id}/pdf")
async def exporter_copie_pdf(copie_id: int, db: Session = Depends(get_db)):
    from fastapi import Response
    from ..config import settings
    
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    if not copie.contenu_brut:
        raise HTTPException(status_code=404, detail="Aucun contenu brut")

    try:
        async with httpx.AsyncClient(timeout=400.0) as client:
            r = await client.post(
                f"{settings.OCR_SERVICE_URL}/ocr/process-pdf",
                files={"file": (f"copie_{copie_id}.txt", copie.contenu_brut.encode("utf-8"), "text/plain")}
            )
            r.raise_for_status()
        return Response(
            content=r.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=copie_{copie_id}.pdf"}
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service OCR indisponible")

@router.put("/{copie_id}/note")
def update_copie_note(
    copie_id: int,
    request: NoteUpdate,
    db: Session = Depends(get_db)
):
    updated = crud.update_copie_note(db, copie_id, request.note)
    if not updated:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    return {"message": "Note mise à jour", "note": request.note}