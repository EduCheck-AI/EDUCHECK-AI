import re
from typing import Dict, List

def parse_exam_text(text: str) -> Dict:
    lines = text.strip().split('\n')
    lines_non_vides = [l.strip() for l in lines if l.strip()]

    # 1. TITRE
    titre = "Examen sans titre"
    for line in lines_non_vides:
        if len(line) < 120:
            titre = line
            break

    # 2. MATIÈRE
    matiere = "Général"
    texte_lower = text.lower()
    if any(w in texte_lower for w in ['math', 'algèbre', 'calcul', 'fonction', 'suite', 'limite', 'dérivée']):
        matiere = "Mathématiques"
    elif any(w in texte_lower for w in ['français', 'littérature', 'grammaire']):
        matiere = "Français"
    elif any(w in texte_lower for w in ['physique', 'chimie', 'molécule']):
        matiere = "Physique-Chimie"
    elif any(w in texte_lower for w in ['histoire', 'géographie']):
        matiere = "Histoire-Géographie"

    # 3. POINTS TOTAUX
    points_totaux = 20.0
    m = re.search(r'\((\d+)\s*points?\)', text, re.IGNORECASE)
    if m:
        val = float(m.group(1))
        if 1 <= val <= 100:
            points_totaux = val

    # 4. DESCRIPTION courte — JAMAIS le contenu brut
    description = f"{matiere} — {titre[:100]}"

    # 5. QUESTIONS
    questions = extraire_questions(text)

    return {
        "titre": titre,
        "description": description,
        "matiere": matiere,
        "points_totaux": points_totaux,
        "statut": "brouillon",
        "questions_count": len(questions),
        "contenu_original": text,
        "questions": questions
    }


def extraire_questions(text: str) -> List[Dict]:
    questions = []
    pattern = re.compile(
        r'(?:^|\n)\s*'
        r'(\d+\s*[-–).]|[a-e]\s*[-–).]|\d+\s*[-–]\s*[a-e]\s*[-–).])'
        r'\s*(.+?)(?=\n\s*(?:\d+\s*[-–).]|[a-e]\s*[-–).]|\d+\s*[-–]\s*[a-e]\s*[-–).]|$))',
        re.DOTALL | re.MULTILINE
    )
    for i, match in enumerate(pattern.finditer(text)):
        numero = match.group(1).strip()
        texte_q = re.sub(r'\n+', ' ', match.group(2)).strip()
        texte_q = re.sub(r' {2,}', ' ', texte_q)
        if len(texte_q) < 5:
            continue
        questions.append({
            "texte": f"{numero} {texte_q}",
            "points": extraire_points(texte_q) or 1.0,
            "type": detecter_type(texte_q),
            "ordre": i + 1
        })

    if not questions:
        mots_cles = ['montrer', 'calculer', 'vérifier', 'déterminer',
                     'déduire', 'démontrer', 'trouver', 'résoudre']
        for ligne in text.split('\n'):
            ligne = ligne.strip()
            if len(ligne) >= 10 and any(m in ligne.lower() for m in mots_cles):
                questions.append({
                    "texte": ligne,
                    "points": 1.0,
                    "type": detecter_type(ligne),
                    "ordre": len(questions) + 1
                })
    return questions


def detecter_type(texte: str) -> str:
    t = texte.lower()
    if any(w in t for w in ['choisir', 'cocher', 'qcm', 'vrai', 'faux']):
        return "qcm"
    if any(w in t for w in ['calculer', 'résoudre', 'montrer', 'démontrer',
                             'lim_', 'sqrt', 'u_n', 'f_n', 'suite', 'fonction']):
        return "calcul"
    return "ouverte"


def extraire_points(texte: str) -> float:
    m = re.search(r'\((\d+[.,]?\d*)\s*(?:pts?|points?)\)', texte, re.IGNORECASE)
    return float(m.group(1).replace(',', '.')) if m else 1.0