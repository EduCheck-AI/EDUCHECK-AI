#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rapport de Projet - EDUCHECK-AI
Plateforme intelligente de gestion et correction d'examens
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from datetime import datetime

# Configuration
PDF_FILENAME = "RAPPORT_PROJET_EDUCHECK_AI.pdf"
doc = SimpleDocTemplate(PDF_FILENAME, pagesize=A4,
                        rightMargin=0.75*inch, leftMargin=0.75*inch,
                        topMargin=0.5*inch, bottomMargin=0.5*inch)

# Styles professionnels
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleCustom',
    parent=styles['Heading1'],
    fontSize=22,
    textColor=colors.HexColor('#1e40af'),
    spaceAfter=5,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='SubtitleCustom',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.HexColor('#4b5563'),
    spaceAfter=15,
    alignment=TA_CENTER,
    fontName='Helvetica'
))

styles.add(ParagraphStyle(
    name='Heading2Custom',
    parent=styles['Heading2'],
    fontSize=12,
    textColor=colors.HexColor('#1e40af'),
    spaceAfter=10,
    spaceBefore=12,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='BodyCustom',
    parent=styles['BodyText'],
    fontSize=10,
    alignment=TA_JUSTIFY,
    spaceAfter=10,
    leading=14
))

# Contenu du document
elements = []

# Titre et en-tête
elements.append(Paragraph("RAPPORT DE PROJET", styles['TitleCustom']))
elements.append(Paragraph("EDUCHECK-AI - Plateforme de Gestion et Correction Intelligente d'Examens", styles['SubtitleCustom']))

# Date
date_str = datetime.now().strftime("%d/%m/%Y")
elements.append(Paragraph(f"<i>Rapport généré le {date_str}</i>", styles['Normal']))
elements.append(Spacer(1, 0.25*inch))

# ═══════════════════════════════════════════════════════════════
# 1. RÉSUMÉ EXÉCUTIF
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("1. Résumé Exécutif", styles['Heading2Custom']))
elements.append(Paragraph(
    "EDUCHECK-AI est une plateforme intégrée conçue pour assister les institutions éducatives "
    "dans la gestion et la correction automatisée d'examens. Le système combine des technologies "
    "modernes de reconnaissance optique de caractères (OCR), d'intelligence artificielle et de "
    "gestion de base de données pour optimiser le processus de correction et de notation des copies d'examen.",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 2. PRÉSENTATION DU PROJET
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("2. Présentation Générale", styles['Heading2Custom']))
elements.append(Paragraph(
    "Le projet est basé sur une architecture microservices composée de trois services principaux "
    "qui communiquent entre eux pour fournir une solution complète :",
    styles['BodyCustom']
))
elements.append(Paragraph(
    "<b>• Auth Service</b> (Port 8001) : Gestion de l'authentification et des autorisations utilisateurs\n"
    "<b>• Exam Service</b> (Port 8002) : Gestion complète des examens, copies et corrections\n"
    "<b>• OCR Service</b> (Port 8003) : Reconnaissance optique et traitement par intelligence artificielle",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 3. COMPOSANTS DÉVELOPPÉS
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("3. Développements Réalisés", styles['Heading2Custom']))
elements.append(Paragraph(
    "<b>Backend (Python + FastAPI)</b>",
    styles['BodyCustom']
))
elements.append(Paragraph(
    "Développement d'une API REST complète avec endpoints pour :\n"
    "• Gestion des utilisateurs et authentification JWT\n"
    "• CRUD complet pour les examens et les questions\n"
    "• Traitement et stockage des copies d'examen\n"
    "• Intégration avec le service OCR pour l'analyse des documents\n"
    "• Gestion des corrections (automatiques et manuelles)\n"
    "• Génération de rapports et statistiques en PDF",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

elements.append(Paragraph(
    "<b>Frontend (React.js)</b>",
    styles['BodyCustom']
))
elements.append(Paragraph(
    "Interface utilisateur complète avec :\n"
    "• Gestion des examens (création, édition, consultation)\n"
    "• Upload et traitement des copies\n"
    "• Interface de correction intuitive\n"
    "• Tableau de bord avec statistiques et analyses\n"
    "• Export des résultats en PDF",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

elements.append(Paragraph(
    "<b>Reconnaissance Optique et IA</b>",
    styles['BodyCustom']
))
elements.append(Paragraph(
    "Service OCR utilisant l'API Groq (modèle LLaVA Vision) pour :\n"
    "• Reconnaissance de l'écriture manuscrite\n"
    "• Identification automatique des formules mathématiques\n"
    "• Conversion des formules en format LaTeX\n"
    "• Traitement parallélisé des images",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 4. FLUX DE FONCTIONNEMENT
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("4. Flux de Fonctionnement", styles['Heading2Custom']))
elements.append(Paragraph(
    "Le processus d'utilisation suit les étapes suivantes :\n"
    "(1) Création d'un examen → (2) Upload des copies scannées → (3) Traitement OCR → "
    "(4) Correction (automatique ou manuelle) → (5) Attribution des notes → (6) Génération du rapport final",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 5. TECHNOLOGIES
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("5. Stack Technologique", styles['Heading2Custom']))
elements.append(Paragraph(
    "<b>Backend :</b> Python 3.9+, FastAPI, SQLAlchemy, PostgreSQL, Uvicorn\n"
    "<b>Frontend :</b> React.js, React Router, Tailwind CSS, Axios\n"
    "<b>IA et Traitement :</b> Groq API (LLaVA Vision), PyPDF2, ReportLab, MiKTeX (LaTeX)\n"
    "<b>Infrastructure :</b> Docker, Git",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

elements.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# 6. POINTS FORTS
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("6. Points Forts du Système", styles['Heading2Custom']))
elements.append(Paragraph(
    "- Architecture modulaire et scalable basée sur les microservices\n"
    "- Intégration d'une intelligence artificielle performante (Groq Vision) pour OCR avancé\n"
    "- Support natif des formules mathématiques complexes en LaTeX\n"
    "- Interface utilisateur ergonomique et intuitive\n"
    "- API bien structurée et documentée avec FastAPI\n"
    "- Sécurité renforcée avec authentification JWT\n"
    "- Gestion complète du cycle de vie d'un examen\n"
    "- Génération de rapports professionnels en PDF",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 7. PERSPECTIVES DE DÉVELOPPEMENT
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("7. Perspectives d'Évolution", styles['Heading2Custom']))
elements.append(Paragraph(
    "Le projet peut être amélioré selon les priorités suivantes :\n"
    "• Déploiement en environnement cloud (AWS, Google Cloud)\n"
    "• Implémentation d'un système de notifications en temps réel (WebSockets)\n"
    "• Intégration avec des systèmes de gestion académique existants (Moodle, Blackboard)\n"
    "• Optimisation des performances via mise en cache stratégique\n"
    "• Expansion de la couverture de tests (unitaires et intégration)\n"
    "• Support de plusieurs langues et formats de documents",
    styles['BodyCustom']
))
elements.append(Spacer(1, 0.1*inch))

# ═══════════════════════════════════════════════════════════════
# 8. CONCLUSION
# ═══════════════════════════════════════════════════════════════
elements.append(Paragraph("8. Conclusion", styles['Heading2Custom']))
elements.append(Paragraph(
    "EDUCHECK-AI constitue une solution fonctionnelle et complète pour la gestion intelligente "
    "d'examens. L'intégration réussie de technologies d'IA modernes permet d'automatiser efficacement "
    "le processus de reconnaissance et de correction d'examens. L'architecture bien pensée en microservices "
    "assure la maintenabilité et la scalabilité du système. Avec les améliorations proposées, ce projet "
    "peut servir de base solide pour une implémentation en environnement de production.",
    styles['BodyCustom']
))

elements.append(Spacer(1, 0.25*inch))

# Pied de page professionnel
elements.append(Paragraph(
    f"<i>Rapport de projet EDUCHECK-AI | Généré le {date_str}</i>",
    styles['Normal']
))

# Génération du PDF
doc.build(elements)
print(f"Rapport professionnel généré : {PDF_FILENAME}")
