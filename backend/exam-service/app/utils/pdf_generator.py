# utils/pdf_generator.py (version complète)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from datetime import datetime
import os

# ========== COULEURS ==========
COLORS = {
    "BLEU_FONCE": HexColor("#1E3A5F"),
    "BLEU_CLAIR": HexColor("#4A90E2"),
    "VERT": HexColor("#27AE60"),
    "VERT_CLAIR": HexColor("#2ECC71"),
    "ORANGE": HexColor("#F39C12"),
    "ROUGE": HexColor("#E74C3C"),
    "GRIS": HexColor("#7F8C8D"),
    "GRIS_CLAIR": HexColor("#ECF0F1"),
    "GRIS_TRES_CLAIR": HexColor("#F5F5F5"),
    "BLANC": HexColor("#FFFFFF"),
    "TEXTE": HexColor("#2C3E50"),
    "JAUNE": HexColor("#F1C40F"),
}

# ========== FONCTIONS UTILITAIRES ==========
def get_mention_text(pourcentage):
    if pourcentage >= 85:
        return "Excellent"
    elif pourcentage >= 70:
        return "Très bien"
    elif pourcentage >= 55:
        return "Assez bien"
    elif pourcentage >= 40:
        return "Passable"
    else:
        return "Insuffisant"

def draw_text_wrapped(c, text, x, y, max_width, font_name="Helvetica", font_size=9, line_height=0.4):
    """Dessine du texte avec retour à la ligne automatique"""
    c.setFont(font_name, font_size)
    words = text.split(' ')
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + " " + word if current_line else word
        if c.stringWidth(test_line, font_name, font_size) < max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    for i, line in enumerate(lines):
        c.drawString(x, y - i * line_height * cm, line)
    return len(lines) * line_height * cm

# ========== FONCTIONS DE DESSIN ==========
def draw_header(c, width, height):
    """Dessine l'en-tête du rapport"""
    y = height - 1.5 * cm
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.rect(0, height - 3.8 * cm, width, 3.8 * cm, fill=1, stroke=0)
    c.setFillColor(COLORS["BLANC"])
    c.setFont("Helvetica-Bold", 24)
    c.drawString(1.5 * cm, height - 2 * cm, "EduCheck AI")
    c.setFont("Helvetica", 11)
    c.drawString(1.5 * cm, height - 2.7 * cm, "Rapport de correction automatique")
    c.setFillColor(COLORS["ORANGE"])
    c.rect(width - 5 * cm, height - 3 * cm, 4 * cm, 1.3 * cm, fill=1, stroke=0)
    c.setFillColor(COLORS["BLANC"])
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 3 * cm, height - 2.55 * cm, "RAPPORT OFFICIEL")

def draw_general_info(c, width, height, copie, exam):
    """Dessine les informations générales"""
    y = height - 4.8 * cm
    
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1.5 * cm, y, "INFORMATIONS GÉNÉRALES")
    c.setStrokeColor(COLORS["BLEU_CLAIR"])
    c.line(1.5 * cm, y - 0.4 * cm, width - 1.5 * cm, y - 0.4 * cm)
    
    y -= 1.2 * cm
    
    c.setFillColor(COLORS["GRIS_TRES_CLAIR"])
    c.roundRect(1.5 * cm, y - 4.5 * cm, width - 3 * cm, 4.8 * cm, 0.5 * cm, fill=1, stroke=0)
    
    c.setFillColor(COLORS["TEXTE"])
    c.setFont("Helvetica-Bold", 10)
    
    c.drawString(2 * cm, y - 0.5 * cm, "Copie ID")
    c.drawString(6 * cm, y - 0.5 * cm, "Étudiant")
    c.drawString(11 * cm, y - 0.5 * cm, "Examen")
    c.drawString(16 * cm, y - 0.5 * cm, "Matière")
    
    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y - 1 * cm, f"#{copie.id}")
    c.drawString(6 * cm, y - 1 * cm, (copie.student_name or f"Étudiant #{copie.student_id}")[:25])
    c.drawString(11 * cm, y - 1 * cm, exam.titre[:25] if exam.titre else "N/A")
    c.drawString(16 * cm, y - 1 * cm, (exam.matiere or "N/A")[:15])
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2 * cm, y - 1.8 * cm, "Date de soumission")
    c.drawString(6 * cm, y - 1.8 * cm, "Date du rapport")
    c.drawString(11 * cm, y - 1.8 * cm, "Statut")
    
    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y - 2.3 * cm, copie.date_soumission.strftime('%d/%m/%Y %H:%M') if copie.date_soumission else "N/A")
    c.drawString(6 * cm, y - 2.3 * cm, datetime.now().strftime('%d/%m/%Y %H:%M'))
    c.drawString(11 * cm, y - 2.3 * cm, exam.statut or "N/A")
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2 * cm, y - 3.1 * cm, "Description")
    c.setFont("Helvetica", 9)
    desc = exam.description or "Aucune description"
    desc = desc[:70] + "..." if len(desc) > 70 else desc
    c.drawString(5 * cm, y - 3.1 * cm, desc)
    
    return y - 5.8 * cm

def draw_note_section(c, width, y, note, points_totaux, pourcentage):
    """Dessine la section note"""
    bg_note = COLORS["VERT"] if pourcentage >= 50 else COLORS["ROUGE"]
    c.setFillColor(bg_note)
    c.roundRect(1.5 * cm, y - 3 * cm, width - 3 * cm, 3 * cm, 0.5 * cm, fill=1, stroke=0)
    
    c.setFillColor(COLORS["BLANC"])
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2.5 * cm, y - 1.2 * cm, "NOTE FINALE")
    c.setFont("Helvetica-Bold", 32)
    c.drawString(2.5 * cm, y - 2.2 * cm, f"{note:.2f}")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(6.5 * cm, y - 1.8 * cm, f"/ {points_totaux:.1f}")
    c.setFont("Helvetica", 12)
    c.drawString(9.5 * cm, y - 1.8 * cm, f"({pourcentage:.1f}%)")
    
    if pourcentage >= 85:
        mention = "EXCELLENT"
        mention_color = COLORS["VERT"]
    elif pourcentage >= 70:
        mention = "TRÈS BIEN"
        mention_color = COLORS["VERT_CLAIR"]
    elif pourcentage >= 55:
        mention = "ASSEZ BIEN"
        mention_color = COLORS["JAUNE"]
    elif pourcentage >= 40:
        mention = "PASSABLE"
        mention_color = COLORS["ORANGE"]
    else:
        mention = "INSUFFISANT"
        mention_color = COLORS["ROUGE"]
    
    c.setFillColor(mention_color)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width - 4 * cm, y - 1.6 * cm, mention)
    
    return y - 3.8 * cm

def draw_progress_bar(c, width, y, pourcentage):
    """Dessine la barre de progression"""
    c.setFillColor(COLORS["GRIS_CLAIR"])
    c.roundRect(1.5 * cm, y, (width - 3 * cm), 0.5 * cm, 0.2 * cm, fill=1, stroke=0)
    bar_color = COLORS["VERT"] if pourcentage >= 50 else COLORS["ORANGE"] if pourcentage >= 40 else COLORS["ROUGE"]
    c.setFillColor(bar_color)
    c.roundRect(1.5 * cm, y, (width - 3 * cm) * (pourcentage / 100), 0.5 * cm, 0.2 * cm, fill=1, stroke=0)
    return y - 0.8 * cm

def draw_comparison(c, width, y, note, points_totaux, moyenne_classe):
    """Dessine la comparaison avec la classe"""
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5 * cm, y, "📊 COMPARAISON AVEC LA CLASSE")
    y -= 0.6 * cm
    
    c.setFillColor(COLORS["GRIS_TRES_CLAIR"])
    c.roundRect(1.5 * cm, y - 2 * cm, width - 3 * cm, 2.2 * cm, 0.5 * cm, fill=1, stroke=0)
    
    ecart = note - moyenne_classe
    ecart_symbol = "+" if ecart >= 0 else ""
    ecart_color = COLORS["VERT"] if ecart >= 0 else COLORS["ROUGE"]
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(COLORS["TEXTE"])
    c.drawString(2.5 * cm, y - 0.7 * cm, "Moyenne de la classe")
    c.drawString(11 * cm, y - 0.7 * cm, "Votre note")
    c.drawString(18 * cm, y - 0.7 * cm, "Écart")
    
    c.setFont("Helvetica", 12)
    c.drawString(2.5 * cm, y - 1.4 * cm, f"{moyenne_classe:.1f}/{points_totaux:.1f}")
    c.drawString(11 * cm, y - 1.4 * cm, f"{note:.1f}/{points_totaux:.1f}")
    c.setFillColor(ecart_color)
    c.drawString(18 * cm, y - 1.4 * cm, f"{ecart_symbol}{abs(ecart):.1f} pts")
    
    return y - 2.8 * cm

def draw_stats_section(c, width, y, details):
    """Dessine les statistiques des réponses"""
    total_questions = len(details)
    questions_correctes = len([d for d in details if d.correct])
    questions_partielle = len([d for d in details if not d.correct and d.points_obtenus > 0])
    questions_incorrectes = len([d for d in details if not d.correct and d.points_obtenus == 0])
    reponses_vides = len([d for d in details if not d.reponse_etudiant or not d.reponse_etudiant.strip()])
    
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5 * cm, y, "📈 STATISTIQUES DES RÉPONSES")
    y -= 0.6 * cm
    
    c.setFillColor(COLORS["GRIS_TRES_CLAIR"])
    c.roundRect(1.5 * cm, y - 2.5 * cm, width - 3 * cm, 2.8 * cm, 0.5 * cm, fill=1, stroke=0)
    
    bar_width = (width - 6 * cm) / 3
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(COLORS["VERT"])
    c.drawString(2.5 * cm, y - 0.6 * cm, "✓ Correctes")
    c.setFillColor(COLORS["ORANGE"])
    c.drawString(2.5 * cm + bar_width + 0.5 * cm, y - 0.6 * cm, "⚠ Partielles")
    c.setFillColor(COLORS["ROUGE"])
    c.drawString(2.5 * cm + 2 * (bar_width + 0.5 * cm), y - 0.6 * cm, "✗ Incorrectes")
    
    correct_width = bar_width * (questions_correctes / total_questions) if total_questions > 0 else 0
    partiel_width = bar_width * (questions_partielle / total_questions) if total_questions > 0 else 0
    incorrect_width = bar_width * (questions_incorrectes / total_questions) if total_questions > 0 else 0
    
    c.setFillColor(COLORS["VERT"])
    c.rect(2.5 * cm, y - 1.3 * cm, correct_width, 0.5 * cm, fill=1, stroke=0)
    c.setFillColor(COLORS["ORANGE"])
    c.rect(2.5 * cm + bar_width + 0.5 * cm, y - 1.3 * cm, partiel_width, 0.5 * cm, fill=1, stroke=0)
    c.setFillColor(COLORS["ROUGE"])
    c.rect(2.5 * cm + 2 * (bar_width + 0.5 * cm), y - 1.3 * cm, incorrect_width, 0.5 * cm, fill=1, stroke=0)
    
    c.setFont("Helvetica", 9)
    c.setFillColor(COLORS["TEXTE"])
    c.drawString(2.5 * cm, y - 2 * cm, f"{questions_correctes}")
    c.drawString(2.5 * cm + bar_width + 0.5 * cm, y - 2 * cm, f"{questions_partielle}")
    c.drawString(2.5 * cm + 2 * (bar_width + 0.5 * cm), y - 2 * cm, f"{questions_incorrectes}")
    
    y = y - 3.3 * cm
    
    # Taux de réussite
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5 * cm, y, "🎯 TAUX DE RÉUSSITE")
    y -= 0.6 * cm
    
    c.setFillColor(COLORS["GRIS_TRES_CLAIR"])
    c.roundRect(1.5 * cm, y - 1.5 * cm, width - 3 * cm, 1.8 * cm, 0.5 * cm, fill=1, stroke=0)
    
    taux_reussite = (questions_correctes / total_questions) * 100 if total_questions > 0 else 0
    bar_color = COLORS["VERT"] if taux_reussite >= 60 else COLORS["ORANGE"] if taux_reussite >= 40 else COLORS["ROUGE"]
    c.setFillColor(bar_color)
    c.roundRect(1.5 * cm, y - 1.3 * cm, (width - 3 * cm) * (taux_reussite / 100), 0.5 * cm, 0.2 * cm, fill=1, stroke=0)
    
    c.setFillColor(COLORS["TEXTE"])
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width / 2, y - 1.1 * cm, f"{taux_reussite:.1f}% de réussite")
    
    return y - 2.2 * cm, reponses_vides

def draw_alert_section(c, width, y, reponses_vides):
    """Dessine les alertes"""
    if reponses_vides > 0:
        c.setFillColor(COLORS["ROUGE"])
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1.5 * cm, y, f"⚠️ ALERTE : {reponses_vides} question(s) sans réponse détectée")
        c.setFillColor(COLORS["GRIS"])
        c.setFont("Helvetica", 8)
        c.drawString(1.5 * cm, y - 0.4 * cm, "→ Vérifiez la qualité du scan ou corrigez manuellement")
        y -= 1 * cm
    return y

def draw_questions_table(c, width, height, details):
    """Dessine le tableau des questions"""
    y = height - 50
    
    # Titre
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor("#2c3e50"))
    c.drawString(50, y, "DÉTAIL DES QUESTIONS")
    y -= 25
    
    # En-têtes du tableau
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor("#ffffff"))
    c.setFillColor(HexColor("#2980b9"))
    c.rect(50, y - 15, 30, 20, fill=1)
    c.rect(80, y - 15, 300, 20, fill=1)
    c.rect(380, y - 15, 60, 20, fill=1)
    c.rect(440, y - 15, 50, 20, fill=1)
    c.rect(490, y - 15, 60, 20, fill=1)
    
    c.setFillColor(HexColor("#ffffff"))
    c.drawString(55, y - 10, "N°")
    c.drawString(85, y - 10, "Question")
    c.drawString(390, y - 10, "Points")
    c.drawString(445, y - 10, "Score")
    c.drawString(500, y - 10, "Statut")
    
    y -= 25
    c.setFillColor(HexColor("#2c3e50"))
    c.setFont("Helvetica", 8)
    
    # Vérifier qu'on a des détails
    if not details:
        c.drawString(50, y, "Aucune donnée disponible")
        return y - 30
    
    for i, d in enumerate(details):
        if y < 50:
            c.showPage()
            y = height - 50
        
        # Numéro
        c.drawString(55, y, str(i + 1))
        
        # Texte de la question (tronqué)
        question_text = d.question_texte[:60] + "..." if len(d.question_texte) > 60 else d.question_texte
        c.drawString(85, y, question_text)
        
        # Points
        points_possibles = float(d.points_possibles) if d.points_possibles else 1
        c.drawString(395, y, f"{points_possibles:.1f}")
        
        # Score
        points_obtenus = float(d.points_obtenus) if d.points_obtenus else 0
        c.drawString(455, y, f"{points_obtenus:.1f}")
        
        # Statut avec couleur
        if points_obtenus >= points_possibles * 0.8:
            c.setFillColor(HexColor("#27ae60"))
            statut = "✓ Correct"
        elif points_obtenus > 0:
            c.setFillColor(HexColor("#f39c12"))
            statut = "⚠ Partiel"
        else:
            c.setFillColor(HexColor("#e74c3c"))
            statut = "✗ Incorrect"
        
        c.drawString(495, y, statut)
        c.setFillColor(HexColor("#2c3e50"))
        
        y -= 20
    
    return y - 20

def draw_answers_feedback(c, width, height, details):
    """Dessine les réponses et feedbacks"""
    y = height - 2 * cm
    
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1.5 * cm, y, "RÉPONSES ET FEEDBACK")
    c.setStrokeColor(COLORS["BLEU_CLAIR"])
    c.line(1.5 * cm, y - 0.4 * cm, width - 1.5 * cm, y - 0.4 * cm)
    
    y -= 1.2 * cm
    
    for i, detail in enumerate(details):
        if y < 7 * cm:
            c.showPage()
            y = height - 2 * cm
        
        # Question
        c.setFillColor(COLORS["BLEU_FONCE"])
        c.setFont("Helvetica-Bold", 11)
        c.drawString(1.5 * cm, y, f"Question {i + 1}")
        
        type_q = detail.type_question
        badge_text = "QCM" if type_q == "qcm" else "CALCUL" if type_q == "calcul" else "OUVERTE"
        badge_color = COLORS["BLEU_CLAIR"] if type_q == "qcm" else COLORS["ORANGE"] if type_q == "calcul" else COLORS["VERT"]
        
        c.setFillColor(badge_color)
        c.rect(width - 4.5 * cm, y - 0.4 * cm, 3.5 * cm, 0.7 * cm, fill=1, stroke=0)
        c.setFillColor(COLORS["BLANC"])
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(width - 2.75 * cm, y - 0.35 * cm, badge_text)
        
        y -= 0.6 * cm
        
        c.setFillColor(COLORS["TEXTE"])
        c.setFont("Helvetica", 9)
        q_text = detail.question_texte
        y -= draw_text_wrapped(c, q_text, 1.5 * cm, y, width - 3 * cm)
        
        y -= 0.3 * cm
        
        # Points
        c.setFillColor(COLORS["BLEU_CLAIR"])
        c.setFont("Helvetica-Bold", 9)
        c.drawString(1.5 * cm, y, f"📊 Points : {detail.points_obtenus:.1f} / {detail.points_possibles:.1f}")
        y -= 0.5 * cm
        
        # Réponse étudiant
        c.setFillColor(COLORS["BLEU_FONCE"])
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1.5 * cm, y, "📝 Réponse de l'étudiant :")
        y -= 0.5 * cm
        
        reponse = detail.reponse_etudiant or ""
        if not reponse or reponse.strip() == "":
            c.setFillColor(COLORS["ROUGE"])
            reponse = "❌ AUCUNE RÉPONSE DÉTECTÉE"
        else:
            c.setFillColor(COLORS["TEXTE"])
        
        c.setFont("Helvetica", 9)
        y -= draw_text_wrapped(c, reponse, 2 * cm, y, width - 4 * cm)
        
        y -= 0.3 * cm
        
        # Bonne réponse
        if detail.bonne_reponse:
            c.setFillColor(COLORS["VERT"])
            c.setFont("Helvetica-Bold", 9)
            c.drawString(1.5 * cm, y, "✅ Bonne réponse attendue :")
            y -= 0.4 * cm
            
            c.setFillColor(COLORS["TEXTE"])
            c.setFont("Helvetica", 9)
            y -= draw_text_wrapped(c, detail.bonne_reponse, 2 * cm, y, width - 4 * cm)
            y -= 0.3 * cm
        
        # Feedback
        feedback = detail.feedback or ""
        c.setFillColor(COLORS["BLEU_FONCE"])
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1.5 * cm, y, "💡 Feedback pédagogique :")
        y -= 0.5 * cm
        
        if not feedback:
            if not detail.reponse_etudiant or detail.reponse_etudiant.strip() == "":
                feedback = "❌ Aucune réponse détectée pour cette question. Vérifiez la qualité du scan."
                c.setFillColor(COLORS["ROUGE"])
            else:
                feedback = "⚠️ Aucun feedback généré automatiquement. Correction manuelle requise."
                c.setFillColor(COLORS["ORANGE"])
        else:
            c.setFillColor(COLORS["VERT"] if "✓" in feedback else COLORS["TEXTE"])
        
        c.setFont("Helvetica", 9)
        y -= draw_text_wrapped(c, feedback, 2 * cm, y, width - 4 * cm)
        
        y -= 0.8 * cm
        
        # Séparateur
        c.setStrokeColor(COLORS["GRIS_CLAIR"])
        c.line(1.5 * cm, y, width - 1.5 * cm, y)
        y -= 0.5 * cm
    
    return y

def draw_recommendations(c, width, height, pourcentage, details, reponses_vides):
    """Dessine les recommandations"""
    y = height - 2 * cm
    
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1.5 * cm, y, "RECOMMANDATIONS")
    c.setStrokeColor(COLORS["BLEU_CLAIR"])
    c.line(1.5 * cm, y - 0.4 * cm, width - 1.5 * cm, y - 0.4 * cm)
    
    y -= 1.2 * cm
    
    recommendations = []
    
    if pourcentage < 50:
        recommendations.append("📚 Reprendre les concepts fondamentaux de la matière")
        recommendations.append("✍️ Consulter les corrections détaillées pour comprendre les erreurs")
        recommendations.append("🎯 Refaire les exercices non réussis")
    elif pourcentage < 70:
        recommendations.append("📖 Approfondir les points qui ont posé problème")
        recommendations.append("💪 Continuer à s'entraîner sur les exercices similaires")
    else:
        recommendations.append("🌟 Félicitations ! Continuez sur cette lancée")
        recommendations.append("🚀 Aborder des exercices plus avancés")
    
    qcm_fails = len([d for d in details if d.type_question == "qcm" and not d.correct])
    open_fails = len([d for d in details if d.type_question == "ouverte" and not d.correct])
    calc_fails = len([d for d in details if d.type_question == "calcul" and not d.correct])
    
    if qcm_fails > 0:
        recommendations.append(f"🎯 {qcm_fails} QCM échoué(s) → revoir les notions clés")
    if open_fails > 0:
        recommendations.append(f"📝 {open_fails} question(s) ouverte(s) non réussie(s) → travailler la rédaction")
    if calc_fails > 0:
        recommendations.append(f"🧮 {calc_fails} calcul(s) incorrect(s) → revoir les méthodes de calcul")
    
    if reponses_vides > 0:
        recommendations.append("🔍 Améliorer la qualité des scans ou écrire de manière plus lisible")
    
    c.setFillColor(COLORS["GRIS_TRES_CLAIR"])
    c.roundRect(1.5 * cm, y - (len(recommendations) * 0.7 + 1) * cm, width - 3 * cm, (len(recommendations) * 0.7 + 1) * cm, 0.5 * cm, fill=1, stroke=0)
    
    c.setFillColor(COLORS["BLEU_FONCE"])
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2.5 * cm, y - 0.6 * cm, "Pour améliorer votre note :")
    
    y -= 1.2 * cm
    
    for rec in recommendations:
        c.setFillColor(COLORS["TEXTE"])
        c.setFont("Helvetica", 9)
        c.drawString(2.5 * cm, y, rec)
        y -= 0.6 * cm
    
    return y

def draw_footer(c, width):
    """Dessine le pied de page"""
    c.setFillColor(COLORS["GRIS"])
    c.setFont("Helvetica", 8)
    c.drawString(1.5 * cm, 1 * cm, f"EduCheck AI - Rapport généré le {datetime.now().strftime('%d/%m/%Y')}")
    c.drawRightString(width - 1.5 * cm, 1 * cm, f"Page {c.getPageNumber()}")