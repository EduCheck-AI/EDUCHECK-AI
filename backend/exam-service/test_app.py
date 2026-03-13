from app.utils.pdf_generator import generer_pdf_examen
from app.utils.latex_injector import inject_formulas

with open('img_final.txt', 'r', encoding='utf-8') as f:
    sample = f.read()

# Simulate the endpoint parsing of the OCR output
text_injected = inject_formulas(sample)

# Simulate the parser returning the context blocks
exam_data = {
    "titre": "Examen Mathématiques",
    "description": "Ceci est un test automatisé d'injection PDF.",
    "matiere": "Mathématiques",
    "points_totaux": 20.0,
    "statut": "brouillon",
    "contenu_brut": text_injected
}

pdf_bytes = generer_pdf_examen(exam_data, [])

with open('test_export.pdf', 'wb') as f:
    f.write(pdf_bytes)

print("PDF généré avec succès dans test_export.pdf")
