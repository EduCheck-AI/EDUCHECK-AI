# Migration des fonctions de correction

## 📋 Résumé

Toutes les fonctions de correction du fichier `backend/exam-service/app/correction.py` ont été déplacées vers les services spécialisés. L'orchestration est maintenant centralisée dans `correction_orchestrator.py`.

## 🔄 Architecture avant / après

### Avant ❌
```
exam-service/correction.py
├── groq_corriger()
├── groq_corriger_sans_reference()
├── corriger_qcm()
├── corriger_avec_groq()
├── corriger_examen()
└── extraire_reponses_ocr()
```

### Après ✅
```
qcm-service/app/main.py
├── corriger_qcm()
└── get_mention()

nlp-service/app/main.py
├── groq_corriger()
├── groq_corriger_sans_reference()
├── corriger_avec_groq()
└── corriger_ouvertes()

ocr-service/app/main.py
├── extraire_reponses_ocr()
└── POST /ocr/extract-answers

exam-service/app/correction_orchestrator.py (NEW)
├── corriger_examen_orchestrated()
└── extraire_reponses_ocr_orchestrated()
```

## 📍 Localisation des fonctions après migration

### 1️⃣ QCM Service (Port 8010)
- **Fichier**: `backend/qcm-service/app/main.py`
- **Fonctions**:
  - `corriger_qcm(questions_exam, reponses_etudiant)` → Correction QCM
  - `get_mention(pourcentage)` → Calcul mention
  - `parse_reponses(raw)` → Parsing JSON
- **Route**: `POST /qcm/correct`

### 2️⃣ NLP Service (Port 8011)
- **Fichier**: `backend/nlp-service/app/main.py`
- **Fonctions**:
  - `groq_corriger(...)` → Correction avec référence via Groq
  - `groq_corriger_sans_reference(...)` → Correction sans référence via Groq
  - `corriger_avec_groq(...)` → Orchestration Groq
  - `corriger_ouvertes(...)` → Correction questions ouvertes
  - `get_mention(pourcentage)` → Calcul mention (répliquée)
- **Routes**:
  - `POST /nlp/correct-open-ended`
  - `POST /nlp/correct-by-type`
  - `POST /nlp/correct-complete` ✨ NEW - Orchestration complète

### 3️⃣ OCR Service (Port 8003)
- **Fichier**: `backend/ocr-service/app/main.py`
- **Fonctions**:
  - `extraire_reponses_ocr(texte_ocr, questions)` → Extraction des réponses depuis OCR
- **Routes**:
  - `POST /ocr/process` → OCR texte
  - `POST /ocr/process-pdf` → OCR → PDF
  - `POST /ocr/extract-answers` ✨ NEW - Extraction des réponses
  - `POST /ocr/process-batch` → Batch OCR

### 4️⃣ Exam Service (Port 8002)
- **Fichier**: `backend/exam-service/app/correction_orchestrator.py` ✨ NEW
- **Fonctions**:
  - `corriger_examen_orchestrated(...)` → Orchestration avec appels aux services
  - `extraire_reponses_ocr_orchestrated(...)` → Appel au OCR-Service pour extraction
- **Utilisation**:
  - Utilisé par `POST /copies/upload-et-corriger` dans `main.py`
  - Appelle QCM-Service pour QCM
  - Appelle NLP-Service pour questions ouvertes et calculs
  - Appelle OCR-Service pour extraction des réponses

## 🔗 Flux de correction

```
exam-service
│
├─ POST /copies/upload-et-corriger
│  │
│  ├─ Récupère le fichier (PDF/image)
│  ├─ Appelle OCR-Service → texte
│  ├─ Sauvegarde copie en DB
│  │
│  └─ Appelle correction_orchestrator.corriger_examen_orchestrated()
│     │
│     ├─ Sépare questions par type (QCM, ouverte, calcul)
│     │
│     ├─ QCM-Service
│     │  └─ POST /qcm/correct
│     │
│     ├─ NLP-Service (questions ouvertes)
│     │  └─ POST /nlp/correct-open-ended
│     │
│     ├─ NLP-Service (calculs)
│     │  └─ POST /nlp/correct-by-type?type_q=calcul
│     │
│     └─ Agrège résultats + sauvegarde en DB
│
└─ Retourne note totale + détails par question
```

## ✨ Nouveautés

### Route d'orchestration NLP ✨
```
POST /nlp/correct-complete
```
Orchestre la correction complète (QCM + ouvertes + calculs) directement via NLP-Service.

### Route d'extraction OCR ✨
```
POST /ocr/extract-answers
```
Extrait les réponses depuis le texte OCR avec support des questions de tous types.

## 📝 Notes techniques

### Imports manuels vs Services
- Avant: `from .correction import extraire_reponses_ocr`
- Après: Appels HTTP async via `httpx` aux services

### Dépendances résolues
- ✅ Pas de couplage direct entre services
- ✅ Communication via HTTP/JSON
- ✅ Résilience avec try-catch
- ✅ Logging centralisé

### Fallbacks
- Si OCR-Service indisponible → extraction locale en fallback
- Si un service échoue → continue avec les autres

## 🗑️ Fichiers archivés

- `backend/exam-service/app/correction.py` → **À supprimer** (voir `correction.py.bak` ou `correction_archive.py` pour historique)

## ✅ Vérification

Vérifiez que tous les services tournent:
```bash
# QCM Service
cd backend/qcm-service
python -m uvicorn app.main:app --port 8010 --reload

# NLP Service
cd backend/nlp-service
python -m uvicorn app.main:app --port 8011 --reload

# OCR Service
cd backend/ocr-service
python -m uvicorn app.main:app --port 8003 --reload

# Exam Service
cd backend/exam-service
python -m uvicorn app.main:app --port 8002 --reload
```

Puis testez:
```bash
curl -X POST http://localhost:8002/copies/upload-et-corriger \
  -F "file=@copie.pdf" \
  -F "exam_id=1" \
  -F "student_id=1"
```
**cd**