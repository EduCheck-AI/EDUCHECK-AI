"""
OCR examen mathématique - Version ULTIME
Avec toutes les optimisations possibles
"""

from pix2tex.cli import LatexOCR
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import sys
import re
from pathlib import Path
import time
import numpy as np

def preprocess_image_avance(image):
    """Version avancée du prétraitement"""
    # Conversion en RGB si nécessaire
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # 1. Conversion en niveaux de gris
    gray = image.convert('L')
    
    # 2. Amélioration du contraste (plus agressive)
    enhancer = ImageEnhance.Contrast(gray)
    gray = enhancer.enhance(2.0)
    
    # 3. Filtre pour renforcer les bords
    gray = gray.filter(ImageFilter.EDGE_ENHANCE_MORE)
    
    # 4. Binarisation adaptative
    import numpy as np
    arr = np.array(gray)
    # Seuillage adaptatif
    seuil = np.mean(arr) * 0.9
    arr_bin = (arr > seuil) * 255
    gray = Image.fromarray(arr_bin.astype('uint8'))
    
    # 5. Remettre en RGB pour pix2tex
    return gray.convert('RGB')

def nettoyer_latex_avance(latex_brut):
    """Nettoyage avancé du LaTeX généré"""
    if not latex_brut:
        return ""
    
    # Supprimer les répétitions excessives
    latex = re.sub(r'(\\mathrm|\\left|\\right|\\big){5,}', '', latex_brut)
    
    # Corriger les commandes mal formées
    latex = re.sub(r'\\[a-z]+\d+', '', latex)  # Supprime \mathrm123
    
    # Remplacer les séquences de points par ...
    latex = re.sub(r'\\cdots{3,}', r'\\cdots', latex)
    latex = re.sub(r'\\ldots{3,}', r'\\ldots', latex)
    
    # Limiter la longueur (éviter les formules gigantesques)
    if len(latex) > 500:
        latex = latex[:500] + "..."
    
    return latex.strip()

def detecter_zones_interessantes(image, nb_bandes):
    """Détecte les bandes qui contiennent probablement du texte"""
    w, h = image.size
    hauteur_bande = h // nb_bandes
    
    # Convertir en niveaux de gris pour analyse
    gray = image.convert('L')
    zones_actives = []
    
    for i in range(nb_bandes):
        top = i * hauteur_bande
        bottom = min((i + 1) * hauteur_bande, h)
        
        # Extraire la bande
        bande = gray.crop((0, top, w, bottom))
        
        # Convertir en numpy array
        arr = np.array(bande)
        
        # Calculer le contraste (écart-type)
        contraste = np.std(arr)
        
        # Compter les pixels sombres (texte)
        pixels_sombres = np.sum(arr < 200)
        densite = pixels_sombres / arr.size
        
        # Une zone est intéressante si elle a du contraste et des pixels sombres
        if contraste > 20 and densite > 0.01:
            zones_actives.append(i)
    
    return zones_actives

def ocr_examen_ultime(image_path: str, nb_bandes=8, mode='auto') -> str:
    """
    Version ultime avec détection automatique et nettoyage avancé
    
    Modes:
    - 'auto' : détecte automatiquement les zones intéressantes
    - 'force' : force l'analyse de toutes les bandes
    - 'rapide' : moins de résolutions, plus rapide
    """
    path = Path(image_path)
    if not path.exists():
        return f"❌ Fichier introuvable: {image_path}"
    
    # Charger et prétraiter
    print("🖼️  Chargement et prétraitement...")
    image = Image.open(path).convert("RGB")
    image_prete = preprocess_image_avance(image)
    w, h = image_prete.size
    
    print(f"📐 Image : {w}x{h}px")
    
    # Sauvegarder l'image prétraitée pour référence
    image_prete.save(path.stem + "_preprocessed.png")
    print(f"💾 Image prétraitée sauvegardée")
    
    # Initialiser le modèle
    print("🔄 Chargement du modèle pix2tex...")
    model = LatexOCR()
    
    # Détecter les zones intéressantes
    if mode == 'auto':
        zones_actives = detecter_zones_interessantes(image_prete, nb_bandes)
        print(f"🎯 {len(zones_actives)} zones actives détectées sur {nb_bandes}")
    else:
        zones_actives = range(nb_bandes)
    
    hauteur_bande = h // nb_bandes
    
    print("🔍 Extraction en cours...\n")
    
    resultats = []
    temps_debut = time.time()
    
    resolutions = [1.0, 0.75, 0.5] if mode != 'rapide' else [1.0, 0.6]
    
    for idx, i in enumerate(zones_actives):
        top = i * hauteur_bande
        bottom = min((i + 1) * hauteur_bande, h)
        
        # Ajouter une petite marge
        marge = 5
        top = max(0, top - marge)
        bottom = min(h, bottom + marge)
        
        bande = image_prete.crop((0, top, w, bottom))
        
        print(f"  Zone {idx+1}/{len(zones_actives)} (bande {i+1})...", end=" ", flush=True)
        
        # Essayer différentes résolutions
        meilleur_latex = ""
        meilleur_score = 0
        
        for facteur in resolutions:
            if facteur < 1.0:
                new_w = int(w * facteur)
                new_h = int((bottom - top) * facteur)
                if new_w < 100 or new_h < 30:
                    continue
                bande_test = bande.resize((new_w, new_h))
            else:
                bande_test = bande
            
            try:
                latex = model(bande_test)
                if latex and len(latex.strip()) > 5:
                    # Score: longueur + commandes LaTeX
                    score = len(latex) + latex.count('\\') * 5
                    if score > meilleur_score:
                        meilleur_score = score
                        meilleur_latex = latex
            except Exception as e:
                continue
        
        if meilleur_latex:
            latex_propre = nettoyer_latex_avance(meilleur_latex)
            preview = latex_propre[:60] + "..." if len(latex_propre) > 60 else latex_propre
            print(f"✓ {len(latex_propre)} chars")
            resultats.append(f"% Bande {i+1}\n{latex_propre}")
        else:
            print("— vide")
    
    temps_fin = time.time()
    print(f"\n✅ Extraction terminée en {temps_fin - temps_debut:.1f} secondes")
    
    return "\n\n".join(resultats)

def sauvegarde_multiformat(texte, image_path):
    """Sauvegarde dans plusieurs formats avec métadonnées"""
    base_name = Path(image_path).stem
    
    # Format .txt brut
    with open(f"{base_name}_brut.txt", 'w', encoding='utf-8') as f:
        f.write(texte)
    
    # Format .tex avec préambule
    contenu_tex = f"""\\documentclass[12pt]{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage[french]{{babel}}
\\usepackage{{amsmath,amssymb}}
\\usepackage{{geometry}}
\\geometry{{margin=2.5cm}}

\\title{{Extraction OCR depuis {image_path}}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

{texte}

\\end{{document}}
"""
    with open(f"{base_name}_complet.tex", 'w', encoding='utf-8') as f:
        f.write(contenu_tex)
    
    # Format .md pour GitHub/Markdown
    contenu_md = f"""# Extraction OCR depuis {image_path}

{texte.replace('%', '\\%')}
"""
    with open(f"{base_name}_resultat.md", 'w', encoding='utf-8') as f:
        f.write(contenu_md)
    
    print(f"\n💾 Formats sauvegardés :")
    print(f"   - {base_name}_brut.txt")
    print(f"   - {base_name}_complet.tex")
    print(f"   - {base_name}_resultat.md")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="OCR LaTeX ULTIME pour examens")
    parser.add_argument("image", nargs="?", default="img.png", help="Chemin de l'image")
    parser.add_argument("-b", "--bandes", type=int, default=8, help="Nombre de bandes")
    parser.add_argument("-m", "--mode", choices=['auto', 'force', 'rapide'], 
                       default='auto', help="Mode d'analyse")
    
    args = parser.parse_args()
    
    print("="*70)
    print("📄 OCR EXAMEN MATHÉMATIQUE - VERSION ULTIME")
    print("="*70)
    
    texte = ocr_examen_ultime(
        args.image, 
        nb_bandes=args.bandes,
        mode=args.mode
    )
    
    print("\n" + "="*70)
    print("📝 RÉSUMÉ DU RÉSULTAT:")
    print("="*70)
    
    # Afficher un aperçu structuré
    if texte:
        lignes = texte.split('\n')
        print(f"\n📊 {len(lignes)} lignes extraites")
        print("\n📋 Aperçu (premières lignes):")
        print("-"*40)
        for ligne in lignes[:15]:
            if ligne.strip():
                print(ligne[:80])
    else:
        print("❌ Aucun résultat obtenu")
    
    print("\n" + "="*70)
    
    # Sauvegarder
    sauvegarde_multiformat(texte, args.image)
    
    print(f"\n✨ Terminé!")