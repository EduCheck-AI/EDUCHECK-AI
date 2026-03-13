from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from PIL import Image
import httpx, base64, io, os, re, tempfile, subprocess, shutil

app = FastAPI(title="OCR Maths → PDF (Groq + pdflatex)")

GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "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")
PDFLATEX_PATH = os.getenv("PDFLATEX_PATH",
    r"C:\Users\souso\AppData\Local\Programs\MiKTeXb\miktex\bin\x64\pdflatex.exe")


async def ocr_groq(contents: bytes) -> str:
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    if img.width > 1800:
        img = img.resize((1800, int(img.height * 1800 / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    prompt = """Tu es un expert OCR spécialisé en examens mathématiques français niveau baccalauréat.
Transcris EXACTEMENT tout le contenu de cette image en LaTeX sans ajouter quoi que ce soit.

RÈGLES :
1. Retourne UNIQUEMENT du code LaTeX valide entre \\begin{document} et \\end{document}
2. Utilise ces packages (déjà inclus) : amsmath, amssymb, geometry, babel french
3. Structure :
   - Titre exercice : \\section*{...}
   - Partie : \\subsection*{...}
   - Questions : \\begin{enumerate} \\item ...  \\end{enumerate}
4. Formules inline : $...$ — ex: $f_n(x) = \\sqrt{x}(\\ln x)^n$
5. Formules display : \\[ ... \\] — pour les grandes formules
6. Symboles :
   - Pour tout : $\\forall$
   - Appartient : $\\in$
   - Infini : $+\\infty$ ou $-\\infty$
   - Limite : $\\lim_{x \\to +\\infty}$
   - Dérivée : $f_n'(x)$
   - Racine : $\\sqrt{x}$
   - Fraction : $\\frac{a}{b}$
   - Intervalle : $]0, +\\infty[$
   - Ensemble : $\\mathbb{N}^*$, $\\mathbb{R}$
   - Lettre grecque : $\\beta$, $\\alpha$
7. Conserve les accents français dans le texte normal
8. NE RAJOUTE RIEN — transcris uniquement ce qui est visible"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url",
                         "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ]
                }],
                "max_tokens": 4000,
                "temperature": 0
            }
        )

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq: {r.text}")

    contenu = r.json()["choices"][0]["message"]["content"].strip()

    # Extraire le contenu entre \begin{document} et \end{document}
    m = re.search(r'\\begin\{document\}(.*?)\\end\{document\}', contenu, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Sinon retourner tout
    return contenu


def compiler_pdf(corps_latex: str, tmpdir: str) -> str:
    """Compile le LaTeX en PDF avec pdflatex"""
    tex_path = os.path.join(tmpdir, "examen.tex")
    pdf_path = os.path.join(tmpdir, "examen.pdf")

    document = r"""\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage{amsmath, amssymb, amsfonts}
\usepackage[margin=2.5cm]{geometry}
\usepackage{parskip}
\usepackage{xcolor}
\usepackage{titlesec}

% Style des sections
\titleformat{\section}[block]{\large\bfseries\color{blue!70!black}}{}{0em}{}[\titlerule]
\titleformat{\subsection}[block]{\normalsize\bfseries\color{blue!50!black}}{}{0em}{}

\begin{document}

""" + corps_latex + r"""

\end{document}
"""

    with open(tex_path, 'w', encoding='utf-8') as f:
        f.write(document)

    # Compiler 2 fois pour les références
    for _ in range(2):
        result = subprocess.run(
            [PDFLATEX_PATH,
             "-interaction=nonstopmode",
             "-output-directory", tmpdir,
             tex_path],
            capture_output=True, text=True, timeout=300,
            cwd=tmpdir
        )

    if not os.path.exists(pdf_path):
        # Log l'erreur pour debug
        log = result.stdout + result.stderr
        raise HTTPException(status_code=500,
            detail=f"pdflatex échoué:\n{log[-2000:]}")

    return pdf_path


@app.post("/ocr/image-to-pdf")
async def image_to_pdf(file: UploadFile = File(...)):
    tmpdir = tempfile.mkdtemp()
    try:
        contents = await file.read()

        # 1. Groq extrait le LaTeX
        corps_latex = await ocr_groq(contents)

        # 2. pdflatex compile en PDF
        pdf_path = compiler_pdf(corps_latex, tmpdir)

        # 3. Copier vers dossier temp final
        nom = file.filename.rsplit('.', 1)[0]
        output_path = os.path.join(tempfile.gettempdir(), f"examen_{nom}.pdf")
        shutil.copy(pdf_path, output_path)

        return FileResponse(output_path, media_type="application/pdf",
            filename=f"examen_{nom}.pdf")

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=repr(e))
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@app.get("/ocr/latex")
async def extraire_latex(file: UploadFile = File(...)):
    """Retourne le LaTeX brut sans compiler"""
    contents = await file.read()
    latex = await ocr_groq(contents)
    return {"latex": latex}


@app.get("/health")
async def health():
    pdflatex_ok = os.path.exists(PDFLATEX_PATH)
    return {
        "status": "ok",
        "groq": GROQ_API_KEY != "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",
        "pdflatex": pdflatex_ok,
        "pdflatex_path": PDFLATEX_PATH
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)