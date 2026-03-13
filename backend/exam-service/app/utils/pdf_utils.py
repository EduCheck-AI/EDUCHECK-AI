"""
Utilitaires pour gérer les fichiers PDF
"""

import PyPDF2
import io
from fastapi import UploadFile

def is_pdf_with_text(file: UploadFile) -> bool:
    """
    Vérifie si un PDF contient du texte (pas des images scannées)
    """
    try:
        content = file.file.read()
        file.file.seek(0)
        
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        if len(pdf_reader.pages) == 0:
            return False
        
        first_page = pdf_reader.pages[0]
        text = first_page.extract_text()
        
        return len(text.strip()) > 50
    except Exception as e:
        print(f"Erreur lors de l'analyse PDF: {e}")
        return False

def extract_text_from_pdf(file: UploadFile) -> str:
    """
    Extrait le texte d'un PDF (pour PDF avec texte, pas images)
    """
    try:
        content = file.file.read()
        file.file.seek(0)
        
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
        
    except Exception as e:
        raise Exception(f"Erreur lors de l'extraction PDF: {str(e)}")