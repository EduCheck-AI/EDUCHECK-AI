# backend/math-service/main.py

"""Math Service - Port 8012
Correction des calculs mathématiques avec SymPy (local)
"""

import sympy as sp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import re

app = FastAPI(title="Math Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODÈLES PYDANTIC
# ============================================================

class QuestionCalc(BaseModel):
    id: int
    texte: str
    points: float
    type_question: str = "calcul"
    reponse_correcte: Optional[str] = None


class CorrectCalcRequest(BaseModel):
    copie_id: int
    questions_exam: List[QuestionCalc]
    reponses_etudiant: Dict[str, Any]


class MathDetail(BaseModel):
    question_id: int
    texte: str
    points_question: float
    points_obtenus: float
    reponse_etudiant: Any
    bonne_reponse: Any
    correct: bool
    statut: str
    feedback: str
    similarity_score: Optional[float] = None


class MathCorrectResponse(BaseModel):
    note: float
    total: float
    details: List[MathDetail]


# ============================================================
# FONCTIONS DE CORRECTION AVEC SYMPY
# ============================================================

def nettoyer_expression(expr: str) -> str:
    """Nettoie l'expression mathématique"""
    # Remplacer ^ par ** (puissance)
    expr = expr.replace('^', '**')
    # Supprimer les espaces
    expr = expr.strip()
    return expr


def comparer_expressions(expr_etudiant: str, expr_correcte: str) -> tuple[bool, float, str]:
    """
    Compare deux expressions mathématiques avec SymPy
    Retourne (correct, pourcentage, feedback)
    """
    try:
        # Nettoyer les expressions
        expr_etudiant = nettoyer_expression(expr_etudiant)
        expr_correcte = nettoyer_expression(expr_correcte)
        
        # Convertir en expressions SymPy
        try:
            expr1 = sp.sympify(expr_etudiant)
            expr2 = sp.sympify(expr_correcte)
        except sp.SympifyError as e:
            return False, 0, f"✗ Expression mathématique invalide : {str(e)}"
        
        # Simplifier
        expr1_simp = sp.simplify(expr1)
        expr2_simp = sp.simplify(expr2)
        
        # Comparer les expressions simplifiées
        if expr1_simp == expr2_simp:
            return True, 100, "✓ Calcul exact !"
        
        # Vérifier si équivalent après développement
        if sp.expand(expr1_simp) == sp.expand(expr2_simp):
            return True, 100, "✓ Calcul correct (forme équivalente)"
        
        # Calculer une similarité approximative
        # Essayer de substituer des valeurs
        try:
            variables = list(expr1_simp.free_symbols.union(expr2_simp.free_symbols))
            if variables:
                # Tester avec quelques valeurs aléatoires
                points_ok = 0
                for val in [0, 1, 2]:
                    subs1 = expr1_simp.subs({v: val for v in variables})
                    subs2 = expr2_simp.subs({v: val for v in variables})
                    if subs1 == subs2:
                        points_ok += 1
                pourcentage = (points_ok / 3) * 100
                if pourcentage >= 60:
                    return False, pourcentage, f"⚠ Réponse partiellement correcte ({pourcentage:.0f}%)"
        except:
            pass
        
        return False, 0, f"✗ Calcul incorrect. Attendu : {expr_correcte}"
        
    except Exception as e:
        return False, 0, f"✗ Erreur de calcul : {str(e)}"


async def corriger_calculs(questions_exam: list, reponses_etudiant: dict) -> dict:
    note_obtenue = 0.0
    total_possible = 0.0
    details = []

    for question in questions_exam:
        points_question = float(question.points or 1)
        total_possible += points_question
        reponse = str(reponses_etudiant.get(str(question.id), "")).strip()

        if not reponse:
            details.append({
                "question_id": question.id,
                "texte": question.texte[:80],
                "points_question": points_question,
                "points_obtenus": 0,
                "reponse_etudiant": None,
                "bonne_reponse": question.reponse_correcte or "Non spécifiée",
                "correct": False,
                "statut": "non_repondu",
                "feedback": "Aucune réponse fournie.",
                "similarity_score": None,
            })
            continue

        try:
            # Si pas de réponse correcte
            if not question.reponse_correcte or question.reponse_correcte.strip() == "":
                # Évaluation basée sur la longueur
                if len(reponse) >= 10:
                    points_obtenus = min(points_question * 0.5, points_question)
                    correct = False
                    feedback = "⚠ Aucune réponse de référence. Réponse évaluée sur la longueur."
                else:
                    points_obtenus = 0
                    correct = False
                    feedback = "Réponse trop courte ou hors sujet."
                similarity = 50 if points_obtenus > 0 else 0
            else:
                correct, similarity, feedback = comparer_expressions(
                    reponse, question.reponse_correcte
                )
                points_obtenus = (similarity / 100) * points_question if not correct else points_question

            points_obtenus = round(points_obtenus, 1)
            note_obtenue += points_obtenus

            details.append({
                "question_id": question.id,
                "texte": question.texte[:80],
                "points_question": points_question,
                "points_obtenus": points_obtenus,
                "reponse_etudiant": reponse,
                "bonne_reponse": question.reponse_correcte or "Non spécifiée",
                "correct": correct,
                "statut": "correct" if correct else ("partiel" if 0 < points_obtenus < points_question else "incorrect"),
                "feedback": feedback,
                "similarity_score": round(similarity, 1),
            })
        except Exception as e:
            print(f"❌ Erreur correction question {question.id}: {e}")
            details.append({
                "question_id": question.id,
                "texte": question.texte[:80],
                "points_question": points_question,
                "points_obtenus": 0,
                "reponse_etudiant": reponse,
                "bonne_reponse": question.reponse_correcte or "Non spécifiée",
                "correct": False,
                "statut": "erreur",
                "feedback": f"Erreur de correction: {str(e)}",
                "similarity_score": None,
            })

    return {
        "note": round(note_obtenue, 2),
        "total": round(total_possible, 2),
        "details": details,
    }


# ============================================================
# ROUTES API
# ============================================================

@app.post("/math/correct-calculation", response_model=MathCorrectResponse)
async def correct_calculation(req: CorrectCalcRequest):
    """Correction des calculs mathématiques avec SymPy"""
    print(f"📥 Math Service: correction de {len(req.questions_exam)} questions")
    result = await corriger_calculs(req.questions_exam, req.reponses_etudiant)
    return MathCorrectResponse(
        note=result["note"],
        total=result["total"],
        details=result["details"],
    )


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "math-service", "engine": "SymPy"}


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 Math Service avec SymPy (calcul symbolique local)")
    print("🌐 http://localhost:8012")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8012)