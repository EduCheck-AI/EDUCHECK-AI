from fastapi import (
    APIRouter,
    Depends,
    Form,
    File,
    UploadFile,
    HTTPException,
    Request,
    Query,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import httpx
import re
from io import BytesIO
from starlette.datastructures import Headers

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
    reponses = {}
    lettres_qcm = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    lignes = texte_ocr.split("\n") if texte_ocr else []

    if not texte_ocr or len(texte_ocr.strip()) < 10:
        print("⚠️ Texte OCR vide ou trop court")
        for question in questions:
            reponses[str(question.id)] = ""
        return reponses

    qcm_questions = [q for q in questions if q.type_question == "qcm"]
    autres_questions = [
        q for q in questions if q.type_question in ("ouverte", "calcul")
    ]

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
            reponses[str(question.id)] = None

    for i, question in enumerate(autres_questions):
        trouve = False
        for j, ligne in enumerate(lignes):
            if re.search(rf"^{i+1}[\.\)\s:]", ligne.strip()):
                reponse = re.sub(rf"^{i+1}[\.\)\s:]*", "", ligne).strip()
                if reponse and len(reponse) > 2:
                    reponses[str(question.id)] = reponse
                    trouve = True
                    break
        if not trouve:
            mots_cles = question.texte.lower().split()[:5]
            for ligne in lignes:
                if any(mot in ligne.lower() for mot in mots_cles):
                    if len(ligne.strip()) > 10:
                        reponses[str(question.id)] = ligne.strip()
                        trouve = True
                        break
        if not trouve:
            reponses[str(question.id)] = ""

    print(
        f"📝 Réponses extraites: {len([r for r in reponses.values() if r])}/{len(questions)} trouvées"
    )
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
    request: Request,
    exam_id: int = Query(...),
    student_name: str = Query(...),
    student_email: str = Query(None),
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")
    print(f"📥 Content-Type reçu: {content_type}")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field is None:
            raise HTTPException(status_code=422, detail="Champ 'file' manquant")
        file_bytes = await file_field.read()
        filename = file_field.filename or f"upload_{exam_id}.jpg"
        file_content_type = file_field.content_type or "image/jpeg"
    else:
        file_bytes = await request.body()
        file_content_type = content_type or "image/jpeg"
        ext = "pdf" if "pdf" in file_content_type else "jpg"
        filename = f"upload_{exam_id}.{ext}"

    print(f"📦 Taille: {len(file_bytes)} bytes")

    if not file_bytes:
        raise HTTPException(status_code=422, detail="Fichier vide")

    def make_file():
        return UploadFile(
            filename=filename,
            file=BytesIO(file_bytes),
            headers=Headers({"content-type": file_content_type}),
        )

    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examen non trouvé")

    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        if is_pdf_with_text(make_file()):
            text = extract_text_from_pdf(make_file())
        else:
            text = await call_ocr_service(make_file())
    else:
        text = await call_ocr_service(make_file())

    # Recherche de l'étudiant
    student_id = None
    if student_email and student_email.strip():
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"http://localhost:8000/auth/students/by-email?email={student_email}"
                )
                if resp.status_code == 200:
                    student_id = resp.json()["id"]
            except Exception as e:
                print(f"❌ Erreur recherche email: {e}")

    if not student_id and student_name:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"http://localhost:8000/auth/students/search?q={student_name}"
                )
                if resp.status_code == 200:
                    students = resp.json()
                    if students:
                        student_id = students[0]["id"]
            except Exception as e:
                print(f"❌ Erreur recherche nom: {e}")

    if not student_id:
        student_id = hash(student_name) % 1000
        print(f"⚠️ ID généré: {student_id}")

    # Sauvegarder la copie avec statut "en_attente" — PAS de correction automatique
    questions = crud.get_questions_by_exam(db, exam_id)
    reponses = await extraire_reponses_ocr(text, questions)

    copie = crud.create_copie(
        db,
        schemas.CopieCreate(
            exam_id=exam_id,
            student_id=student_id,
            student_name=student_name,
            contenu_brut=text,
            reponses=reponses,
            note=None,
            statut="en_attente",
        ),
    )
    db.commit()

    print(f"✅ Copie {copie.id} soumise — en attente de correction du professeur")

    return {
        "copie_id": copie.id,
        "exam_id": exam_id,
        "student_id": student_id,
        "statut": "en_attente",
        "message": "Votre copie a été soumise avec succès. Elle sera corrigée par votre professeur prochainement.",
    }


@router.post("/batch-upload")
async def batch_upload_copies(
    files: list[UploadFile] = File(...),
    exam_id: int = Form(...),
    student_names: str = Form(...),
    student_emails: str = Form("[]"),
    db: Session = Depends(get_db),
):
    print(f"📦 BATCH UPLOAD — {len(files)} fichiers")

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
            extension = file.filename.split(".")[-1].lower()
            if extension == "pdf":
                text = (
                    extract_text_from_pdf(file)
                    if is_pdf_with_text(file)
                    else await call_ocr_service(file)
                )
            else:
                text = await call_ocr_service(file)

            student_id = None
            if student_email:
                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.get(
                            f"http://localhost:8000/auth/students/by-email?email={student_email}"
                        )
                        if resp.status_code == 200:
                            student_id = resp.json()["id"]
                    except:
                        pass
            if not student_id and student_name:
                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.get(
                            f"http://localhost:8000/auth/students/search?q={student_name}"
                        )
                        if resp.status_code == 200:
                            students = resp.json()
                            if students:
                                student_id = students[0]["id"]
                    except:
                        pass
            if not student_id:
                student_id = abs(hash(student_name)) % 10000

            questions = crud.get_questions_by_exam(db, exam_id)
            reponses = await extraire_reponses_ocr(text, questions)

            copie = crud.create_copie(
                db,
                schemas.CopieCreate(
                    exam_id=exam_id,
                    student_id=student_id,
                    student_name=student_name,
                    contenu_brut=text,
                    reponses=reponses,
                    note=None,
                    statut="en_attente",
                ),
            )
            db.commit()

            results.append(
                {
                    "filename": file.filename,
                    "student_name": student_name,
                    "status": "success",
                    "copie_id": copie.id,
                    "statut": "en_attente",
                }
            )

        except Exception as e:
            print(f"❌ Erreur: {str(e)}")
            results.append(
                {
                    "filename": file.filename,
                    "student_name": student_name,
                    "status": "error",
                    "error": str(e),
                }
            )

    return {
        "exam_id": exam_id,
        "total": len(files),
        "success_count": len([r for r in results if r["status"] == "success"]),
        "results": results,
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
                files={
                    "file": (
                        f"copie_{copie_id}.txt",
                        copie.contenu_brut.encode("utf-8"),
                        "text/plain",
                    )
                },
            )
            r.raise_for_status()
        return Response(
            content=r.content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=copie_{copie_id}.pdf"
            },
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service OCR indisponible")


@router.put("/{copie_id}/note")
def update_copie_note(
    copie_id: int, request: NoteUpdate, db: Session = Depends(get_db)
):
    updated = crud.update_copie_note(db, copie_id, request.note)
    if not updated:
        raise HTTPException(status_code=404, detail="Copie non trouvée")
    return {"message": "Note mise à jour", "note": request.note}
