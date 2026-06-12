from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

# ===== Schémas pour Examens =====

class ExamBase(BaseModel):
    titre: str
    description: Optional[str] = None
    matiere: Optional[str] = None
    id_enseignant: int
    points_totaux: float = 20.0
    statut: str = "brouillon"
    contenu_brut: Optional[str] = None 

class ExamCreate(ExamBase):
    contenu_brut: Optional[str] = None

class ExamResponse(ExamBase):
    id: int
    date_creation: datetime
    
    class Config:
        from_attributes = True

class ExamImportPreview(BaseModel):
    """Pour l'aperçu avant création"""
    titre: str
    matiere: Optional[str] = None
    questions_count: int = 0
    points_totaux: float = 20.0
    
# ===== Schémas pour Questions =====

class QuestionBase(BaseModel):
    texte: str
    points: float = 1.0
    type_question: str = "ouverte"
    ordre: int = 0
    reponse_correcte: Optional[str] = None  # Pour les questions à choix multiples, etc.

class QuestionCreate(QuestionBase):
    exam_id: int

class QuestionUpdate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        
# ===== Schémas pour Copies d'étudiants =====

class CopieBase(BaseModel):
    exam_id: int
    student_id: int
    student_name: Optional[str] = None
    contenu_brut: str
    reponses: Optional[Dict] = None
    note: Optional[float] = None

class CopieCreate(CopieBase):
    pass

class CopieResponse(CopieBase):
    id: int
    date_soumission: datetime
    
    class Config:
        from_attributes = True