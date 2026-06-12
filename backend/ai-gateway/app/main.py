# backend/ai-gateway/main.py

"""AI Gateway - Port 8014
Orchestrateur des services IA : QCM + NLP + Math + Results
"""

import json
import re
import os
from typing import Any, Dict, List, Optional
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URLs des services
QCM_SERVICE_URL = "http://localhost:8010"
NLP_SERVICE_URL = "http://localhost:8011"
MATH_SERVICE_URL = "http://localhost:8012"
RESULTS_SERVICE_URL = "http://localhost:8013"

# Clé Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


class Question(BaseModel):
    id: int
    texte: str
    points: float
    type_question: str
    reponse_correcte: Optional[str] = None


class CorrectAIRequest(BaseModel):
    copie_id: int
    questions_exam: List[Question]
    reponses_etudiant: Dict[str, Any]


class CorrectQuestionRequest(BaseModel):
    question_texte: str
    reponse_etudiant: str
    reponse_correcte: Optional[str] = None
    points: float
    type_question: str
    use_groq: bool = False


# ============================================================
# FONCTIONS UTILITAIRES
# ============================================================

def est_question_calcul(question_texte: str, reponse_correcte: str = None) -> bool:
    """Détecte si une question est un calcul mathématique"""
    # Mots-clés mathématiques
    maths_keywords = ['+', '-', '*', '/', '=', 'calcul', 'addition', 'soustraction', 
                      'multiplication', 'division', 'somme', 'différence', 'produit', 'quotient',
                      'x', 'y', 'z', '=', '√', '²', '³', '^', 'sqrt', 'cos', 'sin', 'tan',
                      'log', 'ln', 'exp', 'intégrale', 'dérivée', 'limite']
    
    # Si le type est "calcul" (priorité)
    # Si la réponse correcte est un nombre
    # Si la question contient des opérateurs mathématiques
    
    # Vérifier si la réponse correcte est un nombre
    est_numerique = False
    if reponse_correcte:
        try:
            float(reponse_correcte.replace(',', '.'))
            est_numerique = True
        except:
            pass
    
    # Vérifier si la question contient des symboles mathématiques
    contient_operateurs = any(op in question_texte for op in ['+', '-', '*', '/', '=', '²', '√'])
    
    return est_numerique or contient_operateurs or any(keyword in question_texte.lower() for keyword in maths_keywords)


# ============================================================
# CORRECTION AVEC GROQ
# ============================================================

async def corriger_avec_groq(req: CorrectQuestionRequest) -> dict:
    """Utilise Groq API pour générer un feedback intelligent"""
    
    prompt = f"""
Tu es un professeur expert. Génère un FEEDBACK PÉDAGOGIQUE pour cette question.

Question : {req.question_texte}
Réponse de l'étudiant : {req.reponse_etudiant}
Points disponibles : {req.points}

{
    f"Réponse correcte attendue : {req.reponse_correcte}" 
    if req.reponse_correcte 
    else "⚠️ AUCUNE RÉPONSE CORRECTE FOURNIE. Évalue la réponse uniquement sur sa pertinence."
}

Retourne UNIQUEMENT ce JSON :
{{
  "points_obtenus": <nombre entre 0 et {req.points}>,
  "pourcentage": <nombre entre 0 et 100>,
  "feedback": "Feedback détaillé en français"
}}

RÈGLES POUR LES POINTS :
- Réponse parfaite et complète → {req.points} points (100%)
- Bonne réponse avec quelques imprécisions → {req.points * 0.75} points (75%)
- Réponse partiellement correcte → {req.points * 0.5} points (50%)
- Réponse incorrecte ou hors sujet → 0 points (0%)

Ne retourne PAS de champ "correct". Les points détermineront la couleur.
"""
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500,
                    "temperature": 0.7,
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(502, f"Groq error: {response.text}")
            
            content = response.json()["choices"][0]["message"]["content"].strip()
            content = re.sub(r"```json\n?|```", "", content).strip()
            result = json.loads(content)
            
            points_obtenus = min(float(result.get("points_obtenus", 0)), req.points)
            pourcentage = (points_obtenus / req.points) * 100 if req.points > 0 else 0
            
            correct = pourcentage >= 60
            
            return {
                "points_obtenus": points_obtenus,
                "pourcentage": round(pourcentage, 1),
                "correct": correct,
                "feedback": result.get("feedback", "Feedback généré par IA."),
            }
            
        except Exception as e:
            print(f"❌ Erreur Groq: {e}")
            return {
                "points_obtenus": 0,
                "pourcentage": 0,
                "correct": False,
                "feedback": "Impossible de générer un feedback. Veuillez corriger manuellement."
            }


# ============================================================
# CORRECTION AVEC NLP
# ============================================================

async def corriger_avec_nlp(req: CorrectQuestionRequest) -> dict:
    """Utilise le NLP Service (Sentence-BERT) pour la correction"""
    
    type_normalise = req.type_question
    if type_normalise == "texte":
        type_normalise = "ouverte"
    
    temp_questions = [Question(
        id=1,
        texte=req.question_texte,
        points=req.points,
        type_question=type_normalise,
        reponse_correcte=req.reponse_correcte
    )]
    
    temp_reponses = {"1": req.reponse_etudiant}
    
    result = await correct_ai(CorrectAIRequest(
        copie_id=0,
        questions_exam=temp_questions,
        reponses_etudiant=temp_reponses
    ))
    
    if result.get("details") and len(result["details"]) > 0:
        detail = result["details"][0]
        return {
            "points_obtenus": detail.get("points_obtenus", 0),
            "pourcentage": (detail.get("points_obtenus", 0) / req.points) * 100 if req.points > 0 else 0,
            "correct": detail.get("correct", False),
            "feedback": detail.get("feedback", "")
        }
    
    return {
        "points_obtenus": result.get("note", 0),
        "pourcentage": (result.get("note", 0) / req.points) * 100 if req.points > 0 else 0,
        "correct": result.get("note", 0) == req.points,
        "feedback": ""
    }


# ============================================================
# CORRECTION D'UNE QUESTION UNIQUE (avec détection intelligente)
# ============================================================

@app.post("/ai/correct-question")
async def correct_question(req: CorrectQuestionRequest):
    """Correction d'une seule question avec gestion intelligente"""
    
    print("=" * 50)
    print(f"📥 Requête reçue: use_groq={req.use_groq}, type={req.type_question}")
    print(f"   Réponse étudiant: '{req.reponse_etudiant[:50] if req.reponse_etudiant else 'VIDE'}'")
    
    # RÉPONSES VIDES
    if not req.reponse_etudiant or req.reponse_etudiant.strip() == "":
        return {
            "points_obtenus": 0,
            "pourcentage": 0,
            "correct": False,
            "feedback": "❌ Aucune réponse détectée. L'étudiant n'a pas fourni de réponse à cette question."
        }
    
    reponse = req.reponse_etudiant.strip()
    
    # 🔥 DÉTECTION DES QUESTIONS À RÉPONSE COURTE (prénom, nom, date, etc.)
    mots_cles_courts = ["qui", "quoi", "nom", "prénom", "date", "âge", "combien"]
    est_reponse_courte_attendue = any(mot in req.question_texte.lower() for mot in mots_cles_courts)
    
    # Si la question attend une réponse courte (ex: "qui est moi" → prénom)
    if est_reponse_courte_attendue:
        # Réponse courte mais potentiellement correcte
        if req.reponse_correcte and reponse.lower() == req.reponse_correcte.lower():
            return {
                "points_obtenus": req.points,
                "pourcentage": 100,
                "correct": True,
                "feedback": f"✓ Correct ! ({req.points}/{req.points} pts)"
            }
    
    # 🔥 DÉTECTION DES CALCULS
    if req.type_question == "calcul" or est_question_calcul(req.question_texte, req.reponse_correcte):
        print("🧮 Détection d'une question de calcul - utilisation de Groq")
        result = await corriger_avec_groq(req)
        return result
    
    # 🔥 RÉPONSE COURTE (mais pas pour les questions qui attendent des réponses courtes)
    if len(reponse) < 10 and not est_reponse_courte_attendue:
        return {
            "points_obtenus": 0,
            "pourcentage": 0,
            "correct": False,
            "feedback": "⚠️ Réponse trop courte ou incomplète. L'étudiant n'a pas développé sa réponse."
        }
    
    # RÉPONSE COURTE AVEC CORRESPONDANCE EXACTE (pour les QCM-like ou réponses simples)
    if req.reponse_correcte and reponse.lower() == req.reponse_correcte.lower():
        return {
            "points_obtenus": req.points,
            "pourcentage": 100,
            "correct": True,
            "feedback": f"✓ Correct ! ({req.points}/{req.points} pts)"
        }
    
    try:
        if req.use_groq:
            print("🤖 Utilisation de Groq...")
            result = await corriger_avec_groq(req)
        else:
            print("🧠 Utilisation du NLP Service...")
            result = await corriger_avec_nlp(req)
        
        print(f"📤 Résultat: correct={result['correct']}, points={result['points_obtenus']}")
        return result
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return {
            "points_obtenus": 0,
            "pourcentage": 0,
            "correct": False,
            "feedback": "⚠️ Erreur lors de la correction automatique. Veuillez corriger manuellement."
        }

# ============================================================
# CORRECTION BATCH (pour plusieurs questions)
# ============================================================

@app.post("/ai/correct")
async def correct_ai(req: CorrectAIRequest):
    try:
        # Séparer les questions par type avec détection intelligente
        qcm_questions = []
        open_questions = []
        calc_questions = []
        
        for q in req.questions_exam:
            if q.type_question == "qcm":
                qcm_questions.append(q)
            elif q.type_question == "calcul":
                calc_questions.append(q)
            elif q.type_question == "ouverte":
                # Vérifier si c'est vraiment une question ouverte ou un calcul déguisé
                if est_question_calcul(q.texte, q.reponse_correcte):
                    calc_questions.append(q)
                else:
                    open_questions.append(q)
            else:
                open_questions.append(q)

        async with httpx.AsyncClient(timeout=120.0) as client:
            sections = []

            # 1. Traitement QCM
            if qcm_questions:
                r = await client.post(
                    f"{QCM_SERVICE_URL}/qcm/correct",
                    json={
                        "copie_id": req.copie_id,
                        "questions_exam": [q.model_dump() for q in qcm_questions],
                        "reponses_etudiant": req.reponses_etudiant,
                    },
                )
                r.raise_for_status()
                qcm_payload = r.json()
                sections.append({
                    "note": qcm_payload.get("note", 0),
                    "total": qcm_payload.get("total", 0),
                    "details": qcm_payload.get("details", [])
                })

            # 2. Traitement questions ouvertes (NLP)
            if open_questions:
                r = await client.post(
                    f"{NLP_SERVICE_URL}/nlp/correct-open-ended",
                    json={
                        "copie_id": req.copie_id,
                        "questions_exam": [q.model_dump() for q in open_questions],
                        "reponses_etudiant": req.reponses_etudiant,
                    },
                )
                r.raise_for_status()
                nlp_payload = r.json()
                sections.append({
                    "note": nlp_payload.get("note", 0),
                    "total": nlp_payload.get("total", 0),
                    "details": nlp_payload.get("details", [])
                })

            # 3. Traitement calculs (Math Service)
            if calc_questions:
                try:
                    r = await client.post(
                        f"{MATH_SERVICE_URL}/math/correct-calculation",
                        json={
                            "copie_id": req.copie_id,
                            "questions_exam": [q.model_dump() for q in calc_questions],
                            "reponses_etudiant": req.reponses_etudiant,
                        },
                        timeout=30.0
                    )
                    r.raise_for_status()
                    math_payload = r.json()
                    sections.append({
                        "note": math_payload.get("note", 0),
                        "total": math_payload.get("total", 0),
                        "details": math_payload.get("details", [])
                    })
                except httpx.TimeoutException:
                    print(f"⚠️ Math Service timeout, fallback vers NLP")
                    # Fallback vers NLP si Math Service timeout
                    r = await client.post(
                        f"{NLP_SERVICE_URL}/nlp/correct-open-ended",
                        json={
                            "copie_id": req.copie_id,
                            "questions_exam": [q.model_dump() for q in calc_questions],
                            "reponses_etudiant": req.reponses_etudiant,
                        },
                    )
                    nlp_payload = r.json()
                    sections.append({
                        "note": nlp_payload.get("note", 0),
                        "total": nlp_payload.get("total", 0),
                        "details": nlp_payload.get("details", [])
                    })

            # 4. Agrégation des résultats
            r = await client.post(
                f"{RESULTS_SERVICE_URL}/results/aggregate",
                json={"sections": sections},
            )
            r.raise_for_status()
            return r.json()

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI Gateway error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-gateway"}


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 AI Gateway")
    print("   - use_groq=true  → Groq API")
    print("   - use_groq=false → NLP Service (Sentence-BERT)")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8014)