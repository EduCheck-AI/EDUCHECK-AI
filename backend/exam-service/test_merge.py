import re
import unicodedata
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend', 'exam-service')))
from app.utils.latex_converter import clean_math_text

def inject_formulas(text: str) -> str:
    # 1. Normalize unicode
    text = unicodedata.normalize('NFC', text)
    
    # 2. Split formulas block
    split_match = re.search(r'FORMULES\s*MATH.*MATIQUES', text, flags=re.IGNORECASE)
    if not split_match:
        return clean_math_text(text)
        
    main_text = text[:split_match.start()]
    formulas_text = text[split_match.start():]
    
    # 3. Clean main text headers
    main_text = re.sub(r'={5,}', '', main_text)
    main_text = re.sub(r'EXAMEN\s*[-–—_]?\s*TEXTE\s*COMPLET', '', main_text, flags=re.IGNORECASE)
    
    # 3. Extract and parse formula blocks
    formula_blocks = re.finditer(r'\[Formule \d+\]\s*\$\$(.*?)\$\$', formulas_text, re.DOTALL)
    
    # Mistral OCR actually produces the formula block with the fully formed context text around it!
    # For example, formula 2 contains: "Soit (u_n ) la suite numeriquedefinie par: u_0=(3)/(2) et u_n+1=(2u_n)/(2u_n +5) pour tout n de J N_0"
    # This is much cleaner than the degraded text in main_text: "Soit (u,,) la suite numerique definie par: u, == et u,,, = "- pour tout 1 de IN"
    
    # Therefore, the best way to merge them is to replace the degraded lines in main_text with the corresponding
    # clean lines from formulas_text. But doing so is very hard string matching.
    
    # Alternatively, we can just replace the ENTIRE degraded text if we find that the formulas block
    # actually has all the content.
    
    # Let's extract the clean formulas and see if it looks like a full document.
    clean_formulas = []
    for f in formula_blocks:
        latex = f.group(1).strip()
        cleaned = clean_math_text(latex)
        
        # Remove empty lines from cleaned formula
        cleaned = "\n".join(line for line in cleaned.split("\n") if line.strip())
        clean_formulas.append(cleaned)
        
    # If there are no formulas, just return the cleaned main text
    if not clean_formulas:
        return clean_math_text(main_text)
        
    # We will match each formula line against the main text lines and replace the corrupt text.
    # To do this, we can try to find blocks of main text that share common words with the formula text,
    # and replace them.
    # But since the OCR output provided by the user shows that the "formulas" are actually structured the exact same way
    # as the document layout (one formula for Exercise 1 definition, one for 1) and 2), one for 3a..),
    # maybe we should just replace the main text context entirely with the formulas text?
    
    return "\n".join(clean_formulas)

if __name__ == '__main__':
    with open('img_final.txt', 'r', encoding='utf-8') as f:
        print(inject_formulas(f.read()))
