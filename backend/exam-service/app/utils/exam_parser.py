import re
from typing import Dict, List
import json
import httpx

# Configuration Groq (utilise votre clé existante)
GROQ_API_KEY = "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"

async def extraire_questions_avec_groq(texte_ocr: str) -> List[Dict]:
    """Utilise Groq pour extraire les questions (QCM ou non)"""
    
    prompt = f"""
Analyse ce texte d'examen et extrait TOUTES les questions.

TEXTE:
{texte_ocr}

Retourne UNIQUEMENT ce JSON:
[
  {{
    "type": "qcm",
    "texte": "question",
    "choix": ["choix A", "choix B", "choix C", "choix D"],
    "bonne_reponse": 0
  }}
]

Si tu vois "A)", "B)", "C)", "D)" → type = "qcm"
Si tu vois "Vrai" et "Faux" → type = "qcm" avec choix ["Vrai", "Faux"]

Ne retourne AUCUN texte supplémentaire.
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}",
                         "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 3000
                }
            )
            
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            
            # Nettoyer le markdown
            content = re.sub(r'```json\s*\n?', '', content)
            content = re.sub(r'```\s*$', '', content)
            content = content.strip()
            
            print(f"🔍 Groq a retourné: {content[:300]}...")
            
            # Si Groq dit qu'il n'y a pas de questions
            if "pas de questions" in content.lower() or "aucune question" in content.lower():
                print("⚠️ Groq n'a trouvé aucune question")
                return []
            
            questions = json.loads(content)
            return questions
            
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON: {e}")
        print(f"   Contenu reçu: {content[:200]}")
        return []
    except Exception as e:
        print(f"❌ Erreur Groq: {e}")
        return []
async def parse_exam_text_with_groq(text: str) -> Dict:
    """Version IA utilisant Groq pour extraire toutes les questions"""
    
    print("🔍 Extraction des questions avec Groq...")
    
    questions_groq = await extraire_questions_avec_groq(text)
    
    if not questions_groq:
        print("⚠️ Groq n'a rien trouvé")
        return {
            "titre": "Examen sans titre",
            "description": "",
            "matiere": "Général",
            "points_totaux": 20.0,
            "statut": "brouillon",
            "questions_count": 0,
            "contenu_original": text,
            "questions": []
        }
    
    # Convertir au format attendu
    questions = []
    for i, q in enumerate(questions_groq):
        if q.get("type") == "qcm":
            questions.append({
                "texte": q["texte"],
                "points": 2.0,
                "type": "qcm",
                "ordre": i + 1,
                "reponse_correcte": {
                    "choix": q["choix"],
                    "bonne_reponse": q["bonne_reponse"]
                }
            })
        else:  # ouverte ou calcul
            questions.append({
                "texte": q["texte"],
                "points": 2.0,
                "type": q.get("type", "ouverte"),
                "ordre": i + 1,
                "reponse_correcte": None
            })
    
    # Titre et matière
    lines = text.strip().split('\n')
    titre = "Examen sans titre"
    for line in lines[:10]:
        line = line.strip()
        if len(line) > 10 and len(line) < 100:
            titre = line
            break
    
    matiere = "Général"
    texte_lower = text.lower()
    if any(w in texte_lower for w in ['physique', 'chimie', 'math', 'calcul']):
        matiere = "Scientifique"
    elif any(w in texte_lower for w in ['communication', 'français']):
        matiere = "Littéraire"
    
    print(f"✅ Groq a extrait {len(questions)} questions")
    
    return {
        "titre": titre,
        "description": f"{matiere} — {titre[:100]}",
        "matiere": matiere,
        "points_totaux": len(questions) * 2,
        "statut": "brouillon",
        "questions_count": len(questions),
        "contenu_original": text,
        "questions": questions
    }
    
# Modifiez votre fonction parse_exam_text_with_qcm existante pour utiliser Groq
async def parse_exam_text_with_qcm_async(text: str) -> Dict:
    """Version asynchrone qui utilise Groq"""
    return await parse_exam_text_with_groq(text)