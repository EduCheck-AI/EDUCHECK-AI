from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER
from PIL import Image
import httpx, base64, io, os, re, tempfile

app = FastAPI(title="OCR Maths → PDF (Groq)")

# Clé gratuite sur https://console.groq.com → API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "COLLE_TA_CLE_ICI")


def esc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')


def nettoyer(texte):
    texte = re.sub(r'\*\*([^*]+)\*\*', r'\1', texte)
    texte = re.sub(r'\\\(|\\\)|\\\[|\\\]', '', texte)
    texte = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', texte)
    texte = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', texte)
    texte = re.sub(r'_\{([^}]+)\}', r'_(\1)', texte)
    texte = re.sub(r'\^\{([^}]+)\}', r'^(\1)', texte)
    texte = re.sub(r'\\left[\(\[\{]?|\\right[\)\]\}]?', '', texte)
    for old, new in [
        (r'\leq','<='), (r'\geq','>='), (r'\neq','!='),
        (r'\infty','+inf'), (r'\lim','lim'), (r'\to','->'),
        (r'\rightarrow','->'), (r'\ln','ln'), (r'\log','log'),
        (r'\cdot','.'), (r'\times','x'), (r'\forall','pour tout'),
        (r'\in',' dans '), (r'\mathbb{N}','IN'), (r'\mathbb{R}','IR'),
        (r'\prime',"'"),
    ]:
        texte = texte.replace(old, new)
    texte = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', texte)
    texte = re.sub(r'\\[a-zA-Z]+\s*', ' ', texte)
    texte = re.sub(r'[{}$]', '', texte)
    texte = texte.replace('++inf', '+inf').replace('+-inf', '-inf')
    texte = re.sub(r' {2,}', ' ', texte)
    return texte.strip()


def generer_pdf(texte, nom):
    texte = nettoyer(texte)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        rightMargin=2.5*cm, leftMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm)

    sT  = ParagraphStyle('T',  fontName='Helvetica-Bold', fontSize=16,
        textColor=colors.HexColor('#1a3c5e'), alignment=TA_CENTER, spaceAfter=6)
    sEx = ParagraphStyle('Ex', fontName='Helvetica-Bold', fontSize=13,
        textColor=colors.HexColor('#1a3c5e'), spaceBefore=14, spaceAfter=6)
    sQ  = ParagraphStyle('Q',  fontName='Helvetica-Bold', fontSize=11,
        textColor=colors.HexColor('#2874a6'), spaceBefore=8, spaceAfter=4, leftIndent=15)
    sN  = ParagraphStyle('N',  fontName='Helvetica', fontSize=11,
        spaceBefore=3, spaceAfter=3, leftIndent=20, leading=18)
    sF  = ParagraphStyle('F',  fontName='Courier', fontSize=11,
        textColor=colors.HexColor('#1e6845'), backColor=colors.HexColor('#f0f7f4'),
        spaceBefore=3, spaceAfter=3, leftIndent=25, leading=16)

    story = [
        Paragraph(esc(nom), sT),
        HRFlowable(width="100%", thickness=2,
            color=colors.HexColor('#1a3c5e'), spaceAfter=14)
    ]

    for ligne in texte.split('\n'):
        l = ligne.strip()
        if not l:
            story.append(Spacer(1, 5))
            continue
        le = esc(l)
        if re.match(r'^(Exercice|EXERCICE|Partie)\s*[\dIVX]+', l):
            story.append(Paragraph(le, sEx))
            story.append(HRFlowable(width="60%", thickness=1,
                color=colors.HexColor('#2874a6'), spaceAfter=4))
        elif re.match(r'^[\da-e]+[\)\-\.]', l):
            story.append(Paragraph(le, sQ))
        elif re.search(r'[/^_]|sqrt|lim|->|<=|>=|ln\(|e\^', l):
            story.append(Paragraph(le, sF))
        else:
            story.append(Paragraph(le, sN))

    doc.build(story)
    buf.seek(0)
    return buf.read()


async def ocr_groq(contents):
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    if img.width > 1600:
        img = img.resize((1600, int(img.height * 1600 / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    prompt = (
        "Tu es un expert OCR d'examens mathématiques français. "
        "Transcris EXACTEMENT tout le contenu visible dans cette image.\n"
        "Règles strictes :\n"
        "- Conserve la structure exacte (exercices, parties, questions)\n"
        "- Formules SANS LaTeX : fractions (a)/(b), indices u_n u_(n+1), "
        "puissances x^2 e^x e^(-x), racines sqrt(x), "
        "limites lim(x->+inf) lim(x->-inf) lim(x->0+), "
        "dérivées f'(x) f''(x), inégalités <= >=, infini +inf -inf, "
        "intervalles ]0,+inf[ ou [0,1]\n"
        "- ln(x) s'écrit ln(x), jamais In ou lm\n"
        "- Conserve les accents français (é è à ç î)\n"
        "- NE RAJOUTE RIEN — retourne uniquement ce qui est dans l'image"
    )

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
                "max_tokens": 3000,
                "temperature": 0
            }
        )

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq: {r.text}")

    return r.json()["choices"][0]["message"]["content"].strip()


@app.post("/ocr/image-to-pdf")
async def image_to_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        texte = await ocr_groq(contents)
        nom = file.filename.rsplit('.', 1)[0]
        pdf_bytes = generer_pdf(texte, f"Examen — {nom}")
        tmpdir = tempfile.mkdtemp()
        pdf_path = os.path.join(tmpdir, "examen.pdf")
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)
        return FileResponse(pdf_path, media_type="application/pdf",
            filename=f"examen_{nom}.pdf")
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "llama-4-scout-17b-16e-instruct",
        "configured": GROQ_API_KEY != "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"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)