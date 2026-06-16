"""
OCR SERVICE - Port 8003
Groq (llama-4-scout vision) + pdflatex
- /ocr/process     → texte propre pour la DB
- /ocr/process-pdf → PDF LaTeX avec vraies formules
"""
import numpy as np
import io, os, re, logging, base64, tempfile, subprocess, shutil
from PIL import Image
import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
import pytesseract
from PIL import ImageEnhance, ImageFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY", "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"
)
PDFLATEX_PATH = os.getenv(
    "PDFLATEX_PATH",
    r"C:\Users\souso\AppData\Local\Programs\MiKTeXb\miktex\bin\x64\pdflatex.exe",
)


# ════════════════════════════════════════════════════════
# UTILITAIRES
# ════════════════════════════════════════════════════════


def est_image(contents: bytes, content_type: str = "") -> bool:
    """Vérifie si le contenu est une image ou du texte"""
    if content_type in ("text/plain", "text/html", "application/json"):
        return False
    # Détecter par magic bytes
    signatures = [
        b"\xff\xd8\xff",  # JPEG
        b"\x89PNG",  # PNG
        b"GIF8",  # GIF
        b"BM",  # BMP
        b"\x00\x00\x01\x00",  # ICO
    ]
    for sig in signatures:
        if contents[: len(sig)] == sig:
            return True
    # Si ça ressemble à du texte lisible
    try:
        contents[:200].decode("utf-8")
        return False  # C'est du texte
    except UnicodeDecodeError:
        return True  # Probablement binaire = image/pdf


def preparer_image(contents: bytes) -> str:
    """Redimensionne et encode une image en base64"""
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    if img.width > 1800:
        img = img.resize((1800, int(img.height * 1800 / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def pdf_vers_image(contents: bytes) -> bytes:
    """Convertit la première page d'un PDF en PNG"""
    from pdf2image import convert_from_bytes

    pages = convert_from_bytes(contents, first_page=1, last_page=1)
    if not pages:
        raise HTTPException(status_code=400, detail="PDF invalide")
    buf = io.BytesIO()
    pages[0].save(buf, format="PNG")
    return buf.getvalue()


def nettoyer_texte(texte: str) -> str:
    """Nettoie Markdown et LaTeX du texte Groq"""
    texte = re.sub(r"```[a-z]*\n?", "", texte)
    texte = re.sub(r"```", "", texte)
    texte = re.sub(r"^#{1,6}\s+", "", texte, flags=re.MULTILINE)
    texte = re.sub(r"\*\*([^*]+)\*\*", r"\1", texte)
    texte = re.sub(r"\*([^*]+)\*", r"\1", texte)

    def latex_vers_lisible(s):
        s = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"(\1)/(\2)", s)
        s = re.sub(r"\\sqrt\{([^}]+)\}", r"sqrt(\1)", s)
        s = re.sub(r"_\{([^}]+)\}", r"_(\1)", s)
        s = re.sub(r"\^\{([^}]+)\}", r"^(\1)", s)
        s = re.sub(r"\\lim_\{([^}]+)\}", r"lim_(\1)", s)
        s = re.sub(r"\\to", "->", s)
        s = re.sub(r"\\mathbb\{([^}]+)\}", r"I\1", s)
        for old, new in [
            (r"\\infty", "+inf"),
            (r"\\leq", "<="),
            (r"\\geq", ">="),
            (r"\\neq", "!="),
            (r"\\ln", "ln"),
            (r"\\log", "log"),
            (r"\\forall", "pour tout"),
            (r"\\exists", "il existe"),
            (r"\\in", " dans "),
            (r"\\alpha", "alpha"),
            (r"\\beta", "beta"),
            (r"\\gamma", "gamma"),
            (r"\\pi", "pi"),
            (r"\\prime", "'"),
            (r"\\cdot", "."),
            (r"\\times", "x"),
        ]:
            s = s.replace(old, new)
        s = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", s)
        s = re.sub(r"\\[a-zA-Z]+", "", s)
        s = re.sub(r"[{}]", "", s)
        return s.strip()

    texte = re.sub(
        r"\\\[(.*?)\\\]",
        lambda m: "\n" + latex_vers_lisible(m.group(1)) + "\n",
        texte,
        flags=re.DOTALL,
    )
    texte = re.sub(r"\$([^$]+)\$", lambda m: latex_vers_lisible(m.group(1)), texte)
    texte = re.sub(r" {2,}", " ", texte)
    texte = re.sub(r"\n{3,}", "\n\n", texte)
    return texte.strip()


# ════════════════════════════════════════════════════════
# GROQ — TEXTE PROPRE (depuis image)
# ════════════════════════════════════════════════════════


async def groq_texte_depuis_image(b64: str) -> str:
    prompt = """Tu es un expert OCR d'examens.
Transcris EXACTEMENT tout le contenu de cette image en texte lisible.

RÈGLES STRICTES :
1. STRUCTURE : Conserve exactement (EXERCICE 1, Partie I, Partie II, 1-a, 1-b, 2-a...)
2. FORMULES sans LaTeX ni Markdown :
   - Fractions : (a)/(b)  ex: f'(x) = (1-x)/(e^x - 1)
   - Indices : f_n(x), u_n, u_(n+1)
   - Exposants : x^2, e^x, e^(-2n)
   - Racines : sqrt(x), sqrt(e)
   - Limites : lim_(x->+inf), lim_(x->0+)
   - Dérivées : f'(x), f_n'(x)
   - Intervalles : ]0,+inf[  ]1,e[
3. SYMBOLES : beta, alpha — jamais β α
4. ENSEMBLES : IN*, IR — jamais ℕ ℝ
5. INTERDIT : ##, **, *, $, \\frac, \\sqrt
6. Conserve les accents français (é è à ç)
7. NE RIEN AJOUTER et n'ajoutE AUCUN COMMENTAIRE"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    }
                ],
                "max_tokens": 4000,
                "temperature": 0,
            },
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq: {r.text}")
    texte = r.json()["choices"][0]["message"]["content"].strip()
    return nettoyer_texte(texte)


# ════════════════════════════════════════════════════════
# GROQ — LATEX POUR PDF (depuis image OU texte)
# ════════════════════════════════════════════════════════


async def groq_latex_depuis_image(b64: str) -> str:
    """Image → LaTeX via Groq vision"""
    prompt = """Tu es un expert OCR spécialisé en examenst.
Transcris EXACTEMENT tout le contenu de cette image en LaTeX.

RÈGLES :
1. Retourne UNIQUEMENT le code entre \\begin{document} et \\end{document}
2. Structure : \\section*{EXERCICE 1 : (10 points)}, \\subsection*{Partie I}
3. Questions : \\begin{enumerate}[label=\\alph*)] \\item ... \\end{enumerate}
4. Formules inline : $f_n(x) = \\sqrt{x}(\\ln x)^n$
5. Formules display : \\[ f_n'(x) = \\frac{1}{2\\sqrt{x}}(\\ln x)^{n-1}(2n + \\ln x) \\]
6. Symboles : $\\forall$, $\\in$, $\\lim_{x \\to +\\infty}$, $\\mathbb{N}^*$, $\\beta$
7. NE RIEN INVENTER et n'ajoute aucun commentaire"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    }
                ],
                "max_tokens": 4000,
                "temperature": 0,
            },
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq: {r.text}")

    contenu = r.json()["choices"][0]["message"]["content"].strip()
    contenu = re.sub(r"```latex\n?|```", "", contenu).strip()
    m = re.search(r"\\begin\{document\}(.*?)\\end\{document\}", contenu, re.DOTALL)
    return m.group(1).strip() if m else contenu


async def groq_latex_depuis_texte(texte: str) -> str:
    """Texte lisible → LaTeX via Groq (pas de vision, juste texte)"""
    prompt = f"""Convertis ce texte d'examen en code LaTeX propre.

TEXTE À CONVERTIR :
{texte}

RÈGLES :
1. Retourne UNIQUEMENT le code entre \\begin{{document}} et \\end{{document}}
2. Structure : \\section*{{...}}, \\subsection*{{...}}
3. Questions : \\begin{{enumerate}} \\item ... \\end{{enumerate}}
4. Formules inline : $...$ — ex: $f_n(x) = \\sqrt{{x}}(\\ln x)^n$
5. Formules display : \\[ ... \\]
6. Convertis : sqrt(x) → $\\sqrt{{x}}$, f_n(x) → $f_n(x)$,
   lim_(x->+inf) → $\\lim_{{x \\to +\\infty}}$,
   (a)/(b) → $\\frac{{a}}{{b}}$, IN* → $\\mathbb{{N}}^*$, beta → $\\beta$
7. Conserve les accents français
8. NE RIEN INVENTER et n'ajoute aucun commentaire
et sans ajouter cette phrase à ta réponse : "Voici le code LaTeX propre "
"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4000,
                "temperature": 0,
            },
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq: {r.text}")

    contenu = r.json()["choices"][0]["message"]["content"].strip()
    contenu = re.sub(r"```latex\n?|```", "", contenu).strip()
    m = re.search(r"\\begin\{document\}(.*?)\\end\{document\}", contenu, re.DOTALL)
    return m.group(1).strip() if m else contenu


# ════════════════════════════════════════════════════════
# PDFLATEX
# ════════════════════════════════════════════════════════


def compiler_pdf(corps_latex: str) -> bytes:
    tmpdir = tempfile.mkdtemp()
    try:
        tex_path = os.path.join(tmpdir, "examen.tex")
        pdf_path = os.path.join(tmpdir, "examen.pdf")

        document = (r"""\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage{amsmath, amssymb, amsfonts}
\usepackage[margin=2.5cm]{geometry}
\usepackage{parskip}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{enumitem}
\titleformat{\section}[block]{\large\bfseries\color{blue!70!black}}{}{0em}{}[\titlerule]
\titleformat{\subsection}[block]{\normalsize\bfseries\color{blue!50!black}}{}{0em}{}
\begin{document}
""") + corps_latex + "\n\\end{document}\n"

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(document)

        result = None
        for _ in range(2):
            result = subprocess.run(
                [
                    PDFLATEX_PATH,
                    "-interaction=nonstopmode",
                    "-output-directory",
                    tmpdir,
                    tex_path,
                ],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=tmpdir,
            )

        if not os.path.exists(pdf_path):
            log = (result.stdout + result.stderr) if result else "Pas de log"
            raise HTTPException(
                status_code=500, detail=f"pdflatex échoué:\n{log[-2000:]}"
            )

        with open(pdf_path, "rb") as f:
            return f.read()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ════════════════════════════════════════════════════════
# FASTAPI
# ════════════════════════════════════════════════════════

app = FastAPI(title="OCR Service", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ════════════════════════════════════════════════════════
# FONCTIONS TESSERACT
# ════════════════════════════════════════════════════════

def pretraiter_pour_tesseract(contents: bytes) -> Image.Image:
    """Prétraite l'image pour Tesseract"""
    img = Image.open(io.BytesIO(contents))
    # Niveaux de gris
    img = img.convert('L')
    # Augmenter le contraste
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    # Nettoyer le bruit
    img = img.filter(ImageFilter.MedianFilter())
    return img

async def tesseract_extraire_texte(contents: bytes) -> dict:
    """Extrait le texte avec Tesseract"""
    try:
        img = pretraiter_pour_tesseract(contents)
        texte = pytesseract.image_to_string(img, lang='fra')
        return {
            "success": True,
            "text": texte.strip(),
            "length": len(texte.strip()),
            "source": "tesseract"
        }
    except Exception as e:
        logger.error(f"Tesseract erreur: {e}")
        return {"success": False, "text": "", "source": "tesseract", "error": str(e)}


# ════════════════════════════════════════════════════════
# NOUVELLE ROUTE : TESSERACT SEUL
# ════════════════════════════════════════════════════════

@app.post("/ocr/process-tesseract")
async def process_tesseract(file: UploadFile = File(...)):
    """OCR avec Tesseract uniquement (rapide, texte imprimé)"""
    try:
        logger.info(f"📖 OCR Tesseract: {file.filename}")
        contents = await file.read()
        
        if file.content_type == "application/pdf":
            contents = pdf_vers_image(contents)
        
        result = await tesseract_extraire_texte(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════
# NOUVELLE ROUTE : CHOIX AUTOMATIQUE
# ════════════════════════════════════════════════════════

def detecter_meilleure_ocr(contents: bytes) -> str:
    """
    Détecte quelle OCR utiliser
    - "tesseract" : image nette, texte imprimé
    - "groq" : image floue, manuscrit, formules
    """
    try:
        img = Image.open(io.BytesIO(contents))
        # Vérifier la netteté
        img_array = np.array(img.convert('L'))
        laplacian_var = np.var(np.gradient(np.gradient(img_array)))
        
        if laplacian_var > 50:
            return "tesseract"
        else:
            return "groq"
    except:
        return "groq"

@app.post("/ocr/process-auto")
async def process_auto(file: UploadFile = File(...)):
    """Choix automatique entre Tesseract et Groq"""
    try:
        logger.info(f"🔄 OCR Auto: {file.filename}")
        contents = await file.read()
        
        if file.content_type == "application/pdf":
            contents = pdf_vers_image(contents)
        
        choix = detecter_meilleure_ocr(contents)
        logger.info(f"   Choix: {choix}")
        
        if choix == "tesseract":
            result = await tesseract_extraire_texte(contents)
        else:
            b64 = preparer_image(contents)
            texte = await groq_texte_depuis_image(b64)
            result = {"success": True, "text": texte, "source": "groq"}
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/")
async def root():
    return {
        "service": "OCR Service",
        "version": "3.0.0",
        "endpoints": {
            "POST /ocr/process": "Image → texte propre (pour DB)",
            "POST /ocr/process-pdf": "Image ou texte → PDF LaTeX (pour export)",
            "POST /ocr/process-batch": "Plusieurs images → textes",
        },
    }


@app.get("/health")
async def health():
    return {
        "status": (
            "healthy"
            if GROQ_API_KEY
            != "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"
            else "degraded"
        ),
        "groq": GROQ_API_KEY
        != "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",
        "pdflatex": os.path.exists(PDFLATEX_PATH),
    }


@app.post("/ocr/process")
async def process_image(file: UploadFile = File(...)):
    try:
        logger.info(f"OCR texte: {file.filename}, content_type: {file.content_type}")
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Fichier vide")
        
        # DEBUG — afficher les premiers bytes
        logger.info(f"📦 Taille: {len(contents)} bytes")
        logger.info(f"📦 Premiers bytes: {contents[:20].hex()}")
        
        if file.content_type == "application/pdf":
            contents = pdf_vers_image(contents)

        b64 = preparer_image(contents)
        texte = await groq_texte_depuis_image(b64)
        logger.info(f"{len(texte)} chars extraits")
        return {
            "success": True,
            "filename": file.filename,
            "text": texte,
            "length": len(texte),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ocr/process-pdf")
async def process_to_pdf(file: UploadFile = File(...)):
    """
    Image ou texte → PDF LaTeX avec vraies formules.
    Accepte : images (jpg/png), PDF scanné, texte brut (.txt)
    """
    try:
        logger.info(f"📄 OCR → PDF: {file.filename} ({file.content_type})")
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Fichier vide")

        # CAS 1 : PDF scanné → convertir en image d'abord
        if file.content_type == "application/pdf":
            contents = pdf_vers_image(contents)
            b64 = preparer_image(contents)
            corps_latex = await groq_latex_depuis_image(b64)

        # CAS 2 : Image → OCR vision
        elif est_image(contents, file.content_type):
            b64 = preparer_image(contents)
            corps_latex = await groq_latex_depuis_image(b64)

        # CAS 3 : Texte brut (envoyé par exam-service) → convertir en LaTeX
        else:
            try:
                texte = contents.decode("utf-8")
            except UnicodeDecodeError:
                texte = contents.decode("latin-1")
            logger.info(f"📝 Texte reçu ({len(texte)} chars) → conversion LaTeX")
            corps_latex = await groq_latex_depuis_texte(texte)

        pdf_bytes = compiler_pdf(corps_latex)
        nom = file.filename.rsplit(".", 1)[0]
        logger.info(f"✅ PDF généré — {len(pdf_bytes)} bytes")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={nom}_ocr.pdf"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════
# EXTRACTION DES RÉPONSES DEPUIS LE TEXTE OCR
# ════════════════════════════════════════════════════════


def extraire_reponses_ocr(texte_ocr: str, questions: list) -> dict:
    """Extrait les réponses depuis le texte OCR"""
    reponses = {}
    lettres_qcm = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    lignes = texte_ocr.split("\n")

    qcm_questions = [
        q for q in questions if hasattr(q, "type_question") and q.type_question == "qcm"
    ]
    autres_questions = [
        q
        for q in questions
        if hasattr(q, "type_question") and q.type_question in ("ouverte", "calcul")
    ]

    # 1. Extraction QCM
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

    # 2. Extraction simple pour les autres questions
    for i, question in enumerate(autres_questions):
        for j, ligne in enumerate(lignes):
            if re.search(rf"^{i+1}[\.\)\s:]", ligne.strip()):
                # Prendre le contenu après le numéro
                reponse = re.sub(rf"^{i+1}[\.\)\s:]*", "", ligne).strip()
                if reponse:
                    reponses[str(question.id)] = reponse
                    break
            elif j > 0 and i < len(lignes) - 1:
                # Chercher des mots-clés
                if hasattr(question, "texte"):
                    mots = question.texte.lower().split()[:3]
                    if any(mot in ligne.lower() for mot in mots):
                        reponses[str(question.id)] = ligne.strip()
                        break

    return reponses


@app.post("/ocr/process-batch")
async def process_batch(files: list[UploadFile] = File(...)):
    """Plusieurs images → textes propres"""
    results = []
    for file in files:
        try:
            contents = await file.read()
            if file.content_type == "application/pdf":
                contents = pdf_vers_image(contents)
            b64 = preparer_image(contents)
            texte = await groq_texte_depuis_image(b64)
            results.append({"filename": file.filename, "success": True, "text": texte})
        except Exception as e:
            results.append(
                {"filename": file.filename, "success": False, "error": str(e)}
            )
    return {"success": True, "count": len(results), "results": results}


if __name__ == "__main__":
    import uvicorn

    print("🚀 OCR Service v3.0 → http://localhost:8003")
    print(
        f"   Groq     : {'✅' if GROQ_API_KEY != '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' else '❌ clé manquante'}"
    )
    print(
        f"   pdflatex : {'✅' if os.path.exists(PDFLATEX_PATH) else '❌ introuvable'}"
    )
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
