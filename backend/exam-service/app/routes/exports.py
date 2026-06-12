# routes/exports.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import os
import csv
import json

from ..database import get_db
from .. import crud
from ..utils.pdf_generator import (
    get_mention_text,
    draw_header,
    draw_general_info,
    draw_note_section,
    draw_progress_bar,
    draw_comparison,
    draw_stats_section,
    draw_alert_section,
    draw_questions_table,
    draw_answers_feedback,
    draw_recommendations,
    draw_footer
)

router = APIRouter(prefix="/exports", tags=["Exports"])

# ========== EXPORTS COPIE INDIVIDUELLE ==========

@router.get("/copies/{copie_id}/pdf")
async def export_copie_pdf(copie_id: int, db: Session = Depends(get_db)):
    """Export PDF ultra-détaillé avec analyses et recommandations"""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")
    
    exam = crud.get_exam(db, copie.exam_id)
    
    details = db.execute(
        text("""
            SELECT cd.*, q.texte as question_texte, q.ordre, q.type_question, q.points
            FROM exam.correction_details cd 
            JOIN exam.questions q ON cd.question_id = q.id 
            WHERE cd.copie_id = :copie_id
            ORDER BY q.ordre
        """),
        {"copie_id": copie_id},
    ).fetchall()
    
    # Récupérer la moyenne de la classe
    all_copies = crud.get_copies_by_exam(db, exam.id)
    moyenne_classe = 0
    if all_copies:
        notes = [float(c.note) for c in all_copies if c.note is not None]
        if notes:
            moyenne_classe = sum(notes) / len(notes)
    
    output_path = f"reports/rapport_copie_{copie_id}.pdf"
    os.makedirs("reports", exist_ok=True)
    
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    # PAGE 1
    draw_header(c, width, height)
    y = draw_general_info(c, width, height, copie, exam)
    
    points_totaux = float(exam.points_totaux) if exam.points_totaux else 20.0
    note = float(copie.note) if copie.note is not None else 0
    pourcentage = (note / points_totaux) * 100 if points_totaux > 0 else 0
    
    y = draw_note_section(c, width, y, note, points_totaux, pourcentage)
    y = draw_progress_bar(c, width, y, pourcentage)
    
    if moyenne_classe > 0:
        y = draw_comparison(c, width, y, note, points_totaux, moyenne_classe)
    
    y, reponses_vides = draw_stats_section(c, width, y, details)
    y = draw_alert_section(c, width, y, reponses_vides)
    
    # PAGE 2
    c.showPage()
    y = draw_questions_table(c, width, height, details)
    
    # PAGE 3
    c.showPage()
    y = draw_answers_feedback(c, width, height, details)
    
    # PAGE 4
    c.showPage()
    y = draw_recommendations(c, width, height, pourcentage, details, reponses_vides)
    
    # Pied de page
    draw_footer(c, width)
    
    c.save()
    
    return FileResponse(
    output_path,
    media_type="application/pdf",
    filename=f"rapport_copie_{copie_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
    headers={
        "Cache-Control": "public, max-age=86400",
        "Content-Type": "application/pdf"
    }
)

@router.get("/copies/{copie_id}/csv")
async def export_copie_csv(copie_id: int, db: Session = Depends(get_db)):
    """Export CSV détaillé d'une copie"""
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")
    
    exam = crud.get_exam(db, copie.exam_id)
    
    details = db.execute(
        text("""
            SELECT cd.*, q.texte as question_texte, q.ordre, q.type_question, q.points
            FROM exam.correction_details cd 
            JOIN exam.questions q ON cd.question_id = q.id 
            WHERE cd.copie_id = :copie_id
            ORDER BY q.ordre
        """),
        {"copie_id": copie_id},
    ).fetchall()
    
    output_path = f"reports/rapport_copie_{copie_id}.csv"
    os.makedirs("reports", exist_ok=True)
    
    pourcentage = (copie.note / exam.points_totaux) * 100 if exam.points_totaux > 0 else 0
    mention = get_mention_text(pourcentage)
    
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=';')
        
        writer.writerow(["EDUCHECK AI - RAPPORT DE CORRECTION"])
        writer.writerow([])
        writer.writerow(["INFORMATIONS GÉNÉRALES"])
        writer.writerow(["Copie ID", copie.id])
        writer.writerow(["Étudiant", copie.student_name or f"Étudiant #{copie.student_id}"])
        writer.writerow(["Examen", exam.titre])
        writer.writerow(["Matière", exam.matiere or "Non spécifiée"])
        writer.writerow(["Date", copie.date_soumission.strftime('%d/%m/%Y %H:%M') if copie.date_soumission else "N/A"])
        writer.writerow(["Date du rapport", datetime.now().strftime('%d/%m/%Y %H:%M')])
        writer.writerow([])
        writer.writerow(["RÉSULTAT"])
        writer.writerow(["Note", f"{copie.note} / {exam.points_totaux}"])
        writer.writerow(["Pourcentage", f"{pourcentage:.1f}%"])
        writer.writerow(["Mention", mention])
        writer.writerow([])
        writer.writerow(["DÉTAIL DES QUESTIONS"])
        writer.writerow(["N°", "Question", "Type", "Points", "Statut", "Feedback"])
        
        for i, d in enumerate(details):
            statut = "Correct" if d.correct else ("Partiel" if d.points_obtenus > 0 else "Incorrect")
            writer.writerow([
                i + 1,
                d.question_texte,
                d.type_question,
                f"{d.points_obtenus}/{d.points_possibles}",
                statut,
                d.feedback or ""
            ])
    
    return FileResponse(output_path, media_type="text/csv", filename=f"rapport_copie_{copie_id}.csv")

@router.get("/copies/{copie_id}/json")
async def export_copie_json(copie_id: int, db: Session = Depends(get_db)):
    """Export JSON complet d'une copie"""
    copie = crud.get_copie(db, copie_id)
    if not copie:
        raise HTTPException(404, "Copie non trouvée")
    
    exam = crud.get_exam(db, copie.exam_id)
    
    details = db.execute(
        text("""
            SELECT cd.*, q.texte as question_texte, q.ordre, q.type_question, q.points
            FROM exam.correction_details cd 
            JOIN exam.questions q ON cd.question_id = q.id 
            WHERE cd.copie_id = :copie_id
            ORDER BY q.ordre
        """),
        {"copie_id": copie_id},
    ).fetchall()
    
    pourcentage = (copie.note / exam.points_totaux) * 100 if exam.points_totaux > 0 else 0
    
    rapport = {
        "meta": {
            "plateforme": "EduCheck AI",
            "version": "2.0.0",
            "date_generation": datetime.now().isoformat()
        },
        "etudiant": {
            "id": copie.student_id,
            "nom": copie.student_name
        },
        "examen": {
            "id": exam.id,
            "titre": exam.titre,
            "matiere": exam.matiere,
            "points_totaux": float(exam.points_totaux)
        },
        "correction": {
            "note_obtenue": float(copie.note),
            "pourcentage": round(pourcentage, 1),
            "mention": get_mention_text(pourcentage),
            "questions": []
        }
    }
    
    for d in details:
        rapport["correction"]["questions"].append({
            "ordre": d.ordre,
            "texte": d.question_texte,
            "points_obtenus": float(d.points_obtenus),
            "points_possibles": float(d.points_possibles),
            "reponse_etudiant": d.reponse_etudiant,
            "feedback": d.feedback,
            "correct": d.correct
        })
    
    output_path = f"reports/rapport_copie_{copie_id}.json"
    os.makedirs("reports", exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rapport, f, ensure_ascii=False, indent=2)
    
    return FileResponse(output_path, media_type="application/json", filename=f"rapport_copie_{copie_id}.json")


@router.get("/exams/{exam_id}/class/pdf")
async def export_class_pdf(exam_id: int, db: Session = Depends(get_db)):
    """Export PDF des résultats de toute la classe"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    from datetime import datetime
    
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    
    copies = crud.get_copies_by_exam(db, exam_id)
    
    output_path = f"reports/class_results_exam_{exam_id}.pdf"
    os.makedirs("reports", exist_ok=True)
    
    points_totaux = float(exam.points_totaux) if exam.points_totaux else 20.0
    
    # Format paysage
    landscape_w, landscape_h = A4[1], A4[0]
    pdf = canvas.Canvas(output_path, pagesize=(landscape_w, landscape_h))
    width, height = landscape_w, landscape_h
    
    # En-tête
    pdf.setFont("Helvetica-Bold", 16)
    pdf.setFillColor(HexColor("#2980b9"))
    pdf.drawString(1 * cm, height - 1.5 * cm, f"EduCheck AI - Résultats de la classe")
    
    pdf.setFont("Helvetica", 11)
    pdf.setFillColor(HexColor("#7f8c8d"))
    pdf.drawString(1 * cm, height - 2.2 * cm, f"Examen : {exam.titre}")
    pdf.drawString(1 * cm, height - 2.7 * cm, f"Matière : {exam.matiere or 'Non spécifiée'}")
    pdf.drawString(1 * cm, height - 3.2 * cm, f"Date : {datetime.now().strftime('%d/%m/%Y')}")
    
    # Tableau
    y = height - 4.5 * cm
    
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(1 * cm, y, "N°")
    pdf.drawString(2.5 * cm, y, "Étudiant")
    pdf.drawString(8 * cm, y, "Note")
    pdf.drawString(11 * cm, y, "Pourcentage")
    pdf.drawString(15 * cm, y, "Mention")
    pdf.drawString(20 * cm, y, "Date")
    
    y -= 0.5 * cm
    pdf.setStrokeColor(HexColor("#bdc3c7"))
    pdf.line(1 * cm, y, width - 1 * cm, y)
    y -= 0.3 * cm
    
    pdf.setFont("Helvetica", 9)
    
    stats = {"total": 0, "somme_notes": 0}
    
    for i, copie in enumerate(copies):
        if y < 2 * cm:
            pdf.showPage()
            y = height - 2 * cm
        
        note = float(copie.note) if copie.note else 0
        pourcentage = (note / points_totaux) * 100 if points_totaux > 0 else 0
        mention = get_mention_text(pourcentage)
        
        pdf.drawString(1 * cm, y, str(i + 1))
        pdf.drawString(2.5 * cm, y, copie.student_name or f"Étudiant #{copie.student_id}")
        pdf.drawString(8 * cm, y, f"{note:.1f}/{points_totaux:.1f}")
        pdf.drawString(11 * cm, y, f"{pourcentage:.1f}%")
        
        if pourcentage >= 70:
            pdf.setFillColor(HexColor("#27ae60"))
        elif pourcentage >= 40:
            pdf.setFillColor(HexColor("#f39c12"))
        else:
            pdf.setFillColor(HexColor("#e74c3c"))
        pdf.drawString(15 * cm, y, mention)
        pdf.setFillColor(HexColor("#2c3e50"))
        
        date = copie.date_soumission.strftime("%d/%m/%Y") if copie.date_soumission else "N/A"
        pdf.drawString(20 * cm, y, date)
        
        y -= 0.6 * cm
        stats["total"] += 1
        stats["somme_notes"] += note
    
    # Statistiques
    y -= 1 * cm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(1 * cm, y, "Statistiques :")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(1 * cm, y - 0.5 * cm, f"Total étudiants : {stats['total']}")
    if stats['total'] > 0:
        moyenne = stats['somme_notes'] / stats['total']
        pdf.drawString(1 * cm, y - 1 * cm, f"Moyenne de la classe : {moyenne:.1f}/{points_totaux:.1f}")
        
        reussite_count = 0
        for c in copies:
            note_val = float(c.note) if c.note else 0
            if note_val >= points_totaux / 2:
                reussite_count += 1
        taux_reussite = (reussite_count / len(copies)) * 100 if copies else 0
        pdf.drawString(1 * cm, y - 1.5 * cm, f"Taux de réussite : {taux_reussite:.1f}%")
    
    pdf.save()
    
    return FileResponse(output_path, media_type="application/pdf", filename=f"resultats_classe_{exam.titre}_{datetime.now().strftime('%Y%m%d')}.pdf")

@router.get("/exams/{exam_id}/class/csv")
async def export_class_csv(exam_id: int, db: Session = Depends(get_db)):
    """Export CSV des résultats de classe"""
    exam = crud.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    
    copies = crud.get_copies_by_exam(db, exam_id)
    output_path = f"reports/class_results_exam_{exam_id}.csv"
    os.makedirs("reports", exist_ok=True)
    
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(["Nom étudiant", "Note", "Pourcentage", "Date de soumission"])
        
        for c in copies:
            note = float(c.note) if c.note else 0
            total = float(exam.points_totaux) if exam.points_totaux else 1
            pourcentage = f"{(note/total*100):.1f}%"
            date = c.date_soumission.strftime("%d/%m/%Y %H:%M") if c.date_soumission else "N/A"
            nom = c.student_name or f"Étudiant #{c.student_id}"
            writer.writerow([nom, f"{note:.1f}", pourcentage, date])
    
    return FileResponse(output_path, media_type="text/csv", filename=f"resultats_classe_exam_{exam_id}.csv")

@router.get("/copies/{copie_id}/export/pdf")
async def export_copie_pdf_legacy(copie_id: int, db: Session = Depends(get_db)):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/pdf")

@router.get("/copies/{copie_id}/export/csv")
async def export_copie_csv_legacy(copie_id: int, db: Session = Depends(get_db)):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/csv")

@router.get("/copies/{copie_id}/export/json")
async def export_copie_json_legacy(copie_id: int, db: Session = Depends(get_db)):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/copies/{copie_id}/json")

@router.get("/exams/{exam_id}/export/class/pdf")
async def export_class_pdf_legacy(exam_id: int, db: Session = Depends(get_db)):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/exams/{exam_id}/class/pdf")

@router.get("/exams/{exam_id}/export/class/csv")
async def export_class_csv_legacy(exam_id: int, db: Session = Depends(get_db)):
    """Redirection pour compatibilité"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/exports/exams/{exam_id}/class/csv")