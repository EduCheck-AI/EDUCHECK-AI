"""
Service de correction - Logique commune à plusieurs routes
"""

import re
import httpx
from typing import List, Dict, Any

AI_GATEWAY_URL = "http://localhost:8014"

async def extraire_reponses_ocr(texte_ocr: str, questions: list) -> dict:
    """Extrait les réponses depuis le texte OCR"""
    reponses = {}
    lettres_qcm = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    lignes = texte_ocr.split("\n")

    qcm_questions = [q for q in questions if q.type_question == "qcm"]
    autres_questions = [
        q for q in questions if q.type_question in ("ouverte", "calcul")
    ]

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

    for i, question in enumerate(autres_questions):
        for ligne in lignes:
            if re.search(rf"^{i+1}[\.\)\s:]", ligne.strip()):
                reponse = re.sub(rf"^{i+1}[\.\)\s:]*", "", ligne).strip()
                if reponse:
                    reponses[str(question.id)] = reponse
                    break

    return reponses

async def corriger_avec_gateway(copie_id: int, questions: list, reponses: dict) -> dict:
    """Appelle l'AI Gateway pour la correction"""
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