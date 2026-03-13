from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class Examen(Base):
    __tablename__ = "exams"
    __table_args__ = {'schema': 'exam'}
    
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    description = Column(Text)
    matiere = Column(String(100))
    id_enseignant = Column(Integer, nullable=False)
    points_totaux = Column(DECIMAL(5,2), default=20.0)
    statut = Column(String(20), default="brouillon")
    contenu_brut = Column(Text, nullable=True)  # Contenu complet du fichier importé
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    copies = relationship("CopieEtudiant", back_populates="examen", cascade="all, delete-orphan")

    # Relation avec les questions
    questions = relationship("Question", back_populates="examen", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    __table_args__ = {'schema': 'exam'}
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exam.exams.id", ondelete="CASCADE"), nullable=False)
    texte = Column(Text, nullable=False)
    points = Column(DECIMAL(5,2), default=1.0)
    type_question = Column(String(20), default="ouverte")  # qcm, ouverte, calcul
    ordre = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relation avec l'examen
    examen = relationship("Examen", back_populates="questions")
    
class CopieEtudiant(Base):
    __tablename__ = "copies"
    __table_args__ = {'schema': 'exam'}
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exam.exams.id"), nullable=False)
    student_id = Column(Integer, nullable=False)  # ID depuis auth.users
    contenu_brut = Column(Text, nullable=False)  # Texte complet de la copie
    reponses = Column(JSON, nullable=True)  # Réponses structurées
    note = Column(DECIMAL(5,2), nullable=True)
    date_soumission = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    examen = relationship("Examen", back_populates="copies")