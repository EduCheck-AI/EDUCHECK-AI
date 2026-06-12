"""NLP Service - Port 8011
Correction des questions ouvertes avec Sentence-BERT (modèle local)
"""

import json
import re
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sentence_transformers import SentenceTransformer, util

app = FastAPI(title="NLP Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODÈLE SENTENCE-BERT (local, multilingue français)
# ============================================================

# Modèle multilingue qui comprend le français
# Téléchargement automatique à la première utilisation (environ 1GB)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
print(f"🔄 Chargement du modèle {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)
print(f"✅ Modèle chargé avec succès!")


# ============================================================
# MODÈLES PYDANTIC
# ============================================================


class QuestionOpen(BaseModel):
    id: int
    texte: str
    points: float
    type_question: str = "ouverte"
    reponse_correcte: Optional[str] = None


class CorrectOpenRequest(BaseModel):
    copie_id: int
    questions_exam: List[QuestionOpen]
    reponses_etudiant: Dict[str, Any]


class NlpDetail(BaseModel):
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


class NlpCorrectResponse(BaseModel):
    note: float
    total: float
    details: List[NlpDetail]


# ============================================================
# FONCTION DE CORRECTION AVEC SENTENCE-BERT
# ============================================================


def corriger_avec_bert(
    question_texte: str, reponse_etudiant: str, reponse_correcte: str, points: float
) -> dict:
    """Corrige une question ouverte avec gestion des réponses vides et calculs"""
    
    # 🔥 RÉPONSE VIDE
    if not reponse_etudiant or reponse_etudiant.strip() == "":
        return {
            "points_obtenus": 0,
            "pourcentage": 0,
            "correct": False,
            "feedback": "❌ Aucune réponse détectée. L'étudiant n'a pas fourni de réponse.",
            "similarite": 0,
        }
    
    reponse = reponse_etudiant.strip()
    
    # 🔥 DÉTECTION DES CALCULS SIMPLES
    # Si la question contient des opérateurs mathématiques ou si la réponse est un nombre
    est_calcul = any(op in question_texte for op in ['+', '-', '*', '/', '=', 'calcul']) or reponse.replace('.', '').replace('-', '').isdigit()
    
    # Si c'est un calcul simple (ex: "1+1" → "2")
    if est_calcul and reponse_correcte:
        try:
            # Nettoyer les réponses
            reponse_clean = reponse.strip()
            reponse_correcte_clean = reponse_correcte.strip()
            
            # Comparaison simple
            if reponse_clean == reponse_correcte_clean:
                return {
                    "points_obtenus": points,
                    "pourcentage": 100,
                    "correct": True,
                    "feedback": f"✓ Parfait ! La réponse est correcte ({points}/{points} pts)",
                    "similarite": 1.0,
                }
            
            # Essayer la conversion en nombre
            try:
                if float(reponse_clean) == float(reponse_correcte_clean):
                    return {
                        "points_obtenus": points,
                        "pourcentage": 100,
                        "correct": True,
                        "feedback": f"✓ Correct ! ({points}/{points} pts)",
                        "similarite": 1.0,
                    }
            except:
                pass
        except:
            pass
    
    # 🔥 RÉPONSE TRÈS COURTE (mais pas pour les calculs simples)
    if len(reponse) < 10 and not est_calcul:
        return {
            "points_obtenus": 0,
            "pourcentage": 0,
            "correct": False,
            "feedback": "⚠️ Réponse trop courte. L'étudiant doit développer sa réponse.",
            "similarite": 0,
        }
    
    # Pas de réponse correcte fournie
    if not reponse_correcte or reponse_correcte.strip() == "":
        if len(reponse) >= 30:
            points_obtenus = min(points * 0.5, points)
            return {
                "points_obtenus": round(points_obtenus, 1),
                "pourcentage": 50,
                "correct": points_obtenus >= points * 0.5,
                "feedback": "⚠️ Aucune réponse de référence fournie. Réponse évaluée sur la pertinence.",
                "similarite": 0.5,
            }
        else:
            return {
                "points_obtenus": 0,
                "pourcentage": 0,
                "correct": False,
                "feedback": "⚠️ Réponse trop courte et sans référence.",
                "similarite": 0,
            }
    
    # Calcul des embeddings (réponse valide)
    embedding_etudiant = model.encode(reponse)
    embedding_correct = model.encode(reponse_correcte)
    similarite = util.cos_sim(embedding_etudiant, embedding_correct).item()
    
    points_obtenus = round((similarite * points), 1)
    pourcentage = similarite * 100
    correct = similarite >= 0.6
    
    if similarite >= 0.85:
        feedback = f"✓ Excellent ! Votre réponse est très pertinente ({points_obtenus}/{points} pts)"
    elif similarite >= 0.70:
        feedback = f"✓ Très bien, mais quelques détails à améliorer ({points_obtenus}/{points} pts)"
    elif similarite >= 0.60:
        feedback = f"✓ Bonne réponse, quelques précisions attendues ({points_obtenus}/{points} pts)"
    elif similarite >= 0.45:
        feedback = f"⚠ Réponse partiellement correcte ({points_obtenus}/{points} pts). La réponse attendue : {reponse_correcte[:150]}..."
    else:
        feedback = f"✗ Réponse incorrecte ({points_obtenus}/{points} pts). La réponse attendue : {reponse_correcte[:150]}..."
    
    return {
        "points_obtenus": points_obtenus,
        "pourcentage": round(pourcentage, 1),
        "correct": correct,
        "feedback": feedback,
        "similarite": round(similarite, 3),
    }
# ============================================================
# CORRECTION DES QUESTIONS OUVERTES
# ============================================================


async def corriger_ouvertes(questions_exam: list, reponses_etudiant: dict) -> dict:
    note_obtenue = 0.0
    total_possible = 0.0
    details = []

    for question in questions_exam:
        points_question = float(question.points or 1)
        total_possible += points_question
        reponse = str(reponses_etudiant.get(str(question.id), "")).strip()

        if not reponse:
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
                    "similarity_score": None,
                }
            )
            continue

        try:
            result = corriger_avec_bert(
                question.texte,
                reponse,
                question.reponse_correcte or "",
                points_question,
            )

            points_obtenus = result["points_obtenus"]
            correct = result["correct"]
            note_obtenue += points_obtenus

            details.append(
                {
                    "question_id": question.id,
                    "texte": question.texte[:80],
                    "points_question": points_question,
                    "points_obtenus": round(points_obtenus, 2),
                    "reponse_etudiant": reponse,
                    "bonne_reponse": question.reponse_correcte or "Évalué par IA",
                    "correct": correct,
                    "statut": "correct" if correct else "incorrect",
                    "feedback": result["feedback"],
                    "similarity_score": result.get("similarite", 0) * 100,
                }
            )
        except Exception as e:
            print(f"❌ Erreur correction question {question.id}: {e}")
            details.append(
                {
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
                }
            )

    return {
        "note": round(note_obtenue, 2),
        "total": round(total_possible, 2),
        "details": details,
    }


# ============================================================
# ROUTES API
# ============================================================


@app.post("/nlp/correct-open-ended", response_model=NlpCorrectResponse)
async def correct_open_ended(req: CorrectOpenRequest):
    """Correction des questions ouvertes avec Sentence-BERT"""
    print("=" * 50)
    print(f"📥 NLP Service: correction de {len(req.questions_exam)} questions")
    
    # 🔥 Afficher les réponses correctes reçues
    for q in req.questions_exam:
        print(f"   Question {q.id}: reponse_correcte = '{q.reponse_correcte}'")
    
    result = await corriger_ouvertes(req.questions_exam, req.reponses_etudiant)

    print("📤 Résultat détaillé:")
    for detail in result["details"]:
        print(f"   Q{detail['question_id']}: feedback = '{detail['feedback'][:80]}...'")
    print("=" * 50)
    
    return NlpCorrectResponse(
        note=result["note"],
        total=result["total"],
        details=result["details"],
    )


@app.post("/nlp/correct-single")
async def correct_single(
    question_texte: str, reponse_etudiant: str, reponse_correcte: str, points: float
):
    """Endpoint pour corriger une seule question (appel direct)"""
    result = corriger_avec_bert(
        question_texte, reponse_etudiant, reponse_correcte, points
    )
    return result


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "nlp-service", "model": MODEL_NAME}


if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("🚀 NLP Service avec Sentence-BERT")
    print(f"📦 Modèle: {MODEL_NAME}")
    print("🌐 http://localhost:8011")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8011)