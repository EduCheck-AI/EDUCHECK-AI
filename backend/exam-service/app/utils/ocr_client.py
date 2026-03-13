"""
Client pour appeler le service OCR
Rôle: Communiquer avec OCR Service (port 8003)
"""

import re
import httpx
from fastapi import UploadFile, HTTPException
from ..config import settings

OCR_SERVICE_URL = settings.OCR_SERVICE_URL


def nettoyer_texte_ocr(texte: str) -> str:
    """
    Nettoie le texte retourné par Groq :
    - Supprime le Markdown (##, **, *, ```)
    - Nettoie le LaTeX inline ($...$) → texte lisible
    - Corrige les accents perdus
    - Normalise les espaces
    """
    if not texte:
        return texte

    # Supprimer les blocs de code markdown
    texte = re.sub(r'```[a-z]*\n?', '', texte)
    texte = re.sub(r'```', '', texte)

    # Supprimer les titres markdown ## ### #
    texte = re.sub(r'^#{1,6}\s+', '', texte, flags=re.MULTILINE)

    # Supprimer le gras/italique markdown **texte** *texte*
    texte = re.sub(r'\*\*([^*]+)\*\*', r'\1', texte)
    texte = re.sub(r'\*([^*]+)\*', r'\1', texte)

    # Convertir LaTeX inline $...$ en texte lisible
    def latex_to_text(m):
        s = m.group(1)
        # Fractions
        s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', s)
        # Racines
        s = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', s)
        s = re.sub(r'\\sqrt', r'sqrt', s)
        # Indices et exposants
        s = re.sub(r'_\{([^}]+)\}', r'_(\1)', s)
        s = re.sub(r'\^\{([^}]+)\}', r'^(\1)', s)
        s = re.sub(r'_([a-zA-Z0-9])', r'_\1', s)
        s = re.sub(r'\^([a-zA-Z0-9])', r'^\1', s)
        # Limites
        s = re.sub(r'\\lim_\{([^}]+)\}', r'lim_(\1)', s)
        s = re.sub(r'\\lim_([a-z])', r'lim_\1', s)
        s = re.sub(r'\\to', r'->', s)
        # Symboles communs
        replacements = [
            (r'\\infty', '+inf'),
            (r'\+\\infty', '+inf'),
            (r'-\\infty', '-inf'),
            (r'\\leq', '<='),
            (r'\\geq', '>='),
            (r'\\neq', '!='),
            (r'\\ln', 'ln'),
            (r'\\log', 'log'),
            (r'\\exp', 'exp'),
            (r'\\sin', 'sin'),
            (r'\\cos', 'cos'),
            (r'\\tan', 'tan'),
            (r'\\forall', 'pour tout'),
            (r'\\exists', 'il existe'),
            (r'\\in', ' dans '),
            (r'\\subset', ' ⊂ '),
            (r'\\mathbb\{N\}', 'IN'),
            (r'\\mathbb\{R\}', 'IR'),
            (r'\\mathbb\{Z\}', 'IZ'),
            (r'\\mathbb\{N\}\^?\*', 'IN*'),
            (r'\\alpha', 'alpha'),
            (r'\\beta', 'beta'),
            (r'\\gamma', 'gamma'),
            (r'\\delta', 'delta'),
            (r'\\epsilon', 'epsilon'),
            (r'\\lambda', 'lambda'),
            (r'\\mu', 'mu'),
            (r'\\pi', 'pi'),
            (r'\\theta', 'theta'),
            (r'\\sigma', 'sigma'),
            (r'\\prime', "'"),
            (r'\\cdot', '.'),
            (r'\\times', 'x'),
            (r'\\left[\(\[\{]?', ''),
            (r'\\right[\)\]\}]?', ''),
        ]
        for pattern, repl in replacements:
            s = re.sub(pattern, repl, s)
        # Supprimer les accolades et backslashes restants
        s = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', s)
        s = re.sub(r'\\[a-zA-Z]+', '', s)
        s = re.sub(r'[{}]', '', s)
        s = s.strip()
        return s

    # Traiter les formules display \[ ... \]
    texte = re.sub(r'\\\[(.*?)\\\]', lambda m: '\n' + latex_to_text(m) + '\n', texte, flags=re.DOTALL)

    # Traiter les formules inline $...$
    texte = re.sub(r'\$([^$]+)\$', latex_to_text, texte)

    # Corriger les accents perdus courants
    corrections_accents = {
        'definir': 'définir',
        'definie': 'définie',
        'defini': 'défini',
        'deduit': 'déduit',
        'deduire': 'déduire',
        'deduisons': 'déduisons',
        'considere': 'considère',
        'considerer': 'considérer',
        'verifie': 'vérifie',
        'verifier': 'vérifier',
        'etudier': 'étudier',
        'etudie': 'étudie',
        'determiner': 'déterminer',
        'determine': 'détermine',
        'montrer': 'montrer',
        'calculer': 'calculer',
        'numerique': 'numérique',
        'geometrique': 'géométrique',
        'periodique': 'périodique',
        'derivee': 'dérivée',
        'derivable': 'dérivable',
        'continue': 'continue',
        'continuite': 'continuité',
        'integrale': 'intégrale',
        'inegalite': 'inégalité',
        'egalite': 'égalité',
        'croissante': 'croissante',
        'decroissante': 'décroissante',
        'croissant': 'croissant',
        'decroissant': 'décroissant',
        'parite': 'parité',
        'periodicite': 'périodicité',
        'representatif': 'représentatif',
        'represente': 'représente',
        'repere': 'repère',
        'equation': 'équation',
        'systeme': 'système',
        'theoreme': 'théorème',
        'reponse': 'réponse',
    }
    for wrong, correct in corrections_accents.items():
        texte = re.sub(r'\b' + wrong + r'\b', correct, texte, flags=re.IGNORECASE)

    # Normaliser les espaces multiples
    texte = re.sub(r' {2,}', ' ', texte)
    # Normaliser les lignes vides multiples
    texte = re.sub(r'\n{3,}', '\n\n', texte)

    return texte.strip()


async def call_ocr_service(file: UploadFile, use_math_mode: bool = False) -> str:
    try:
        content = await file.read()
        await file.seek(0)

        endpoint = "process-math" if use_math_mode else "process"

        async with httpx.AsyncClient(timeout=400.0) as client:
            response = await client.post(
                f"{OCR_SERVICE_URL}/ocr/{endpoint}",
                files={"file": (file.filename, content, file.content_type)}
            )
            response.raise_for_status()

        result = response.json()
        text = result.get("text") or ""

        # Nettoyer le texte avant de le retourner
        text = nettoyer_texte_ocr(text)

        return text

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Service OCR indisponible"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Erreur OCR: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'appel au service OCR: {str(e)}"
        )