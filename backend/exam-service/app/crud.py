from sqlalchemy.orm import Session
from . import models, schemas

# ===== CRUD pour Examens =====

def create_exam(db: Session, exam: schemas.ExamCreate):
    db_exam = models.Examen(
        titre=exam.titre,
        description=exam.description,
        matiere=exam.matiere,
        id_enseignant=exam.id_enseignant,
        points_totaux=exam.points_totaux,
        statut=exam.statut,
        contenu_brut=exam.contenu_brut
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def get_exam(db: Session, exam_id: int):
    return db.query(models.Examen).filter(models.Examen.id == exam_id).first()

def get_exams_by_teacher(db: Session, teacher_id: int):
    return db.query(models.Examen).filter(
        models.Examen.id_enseignant == teacher_id
    ).all()

def get_all_exams(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Examen).offset(skip).limit(limit).all()

def update_exam(db: Session, exam_id: int, exam: schemas.ExamCreate):
    db_exam = get_exam(db, exam_id)
    if db_exam:
        db_exam.titre = exam.titre
        db_exam.description = exam.description
        db_exam.matiere = exam.matiere
        db_exam.points_totaux = exam.points_totaux
        db_exam.statut = exam.statut
        db_exam.contenu_brut = exam.contenu_brut
        db.commit()
        db.refresh(db_exam)
    return db_exam

def delete_exam(db: Session, exam_id: int):
    db_exam = get_exam(db, exam_id)
    if db_exam:
        db.delete(db_exam)
        db.commit()
        return True
    return False

def publish_exam(db: Session, exam_id: int):
    db_exam = get_exam(db, exam_id)
    if db_exam:
        db_exam.statut = "publié"
        db.commit()
        db.refresh(db_exam)
    return db_exam

# ===== CRUD pour Questions =====

def create_question(db: Session, question: schemas.QuestionCreate):
    # PAS de json.dumps ici - question.reponse_correcte est déjà une string
    db_question = models.Question(
        exam_id=question.exam_id,
        texte=question.texte,
        points=question.points,
        type_question=question.type_question,
        ordre=question.ordre,
        reponse_correcte=question.reponse_correcte  # ← Déjà une string
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_questions_by_exam(db: Session, exam_id: int):
    # BUG CORRIGÉ : backslash parasite supprimé
    return (
        db.query(models.Question)
        .filter(models.Question.exam_id == exam_id)
        .order_by(models.Question.ordre)
        .all()
    )

def get_question(db: Session, question_id: int):
    return db.query(models.Question).filter(
        models.Question.id == question_id
    ).first()

def update_question(db: Session, question_id: int, question: schemas.QuestionUpdate):
    db_question = get_question(db, question_id)
    if db_question:
        for key, value in question.model_dump(exclude_unset=True).items():
            setattr(db_question, key, value)
        db.commit()
        db.refresh(db_question)
    return db_question

def delete_question(db: Session, question_id: int):
    db_question = get_question(db, question_id)
    if db_question:
        db.delete(db_question)
        db.commit()
        return True
    return False

def delete_questions_by_exam(db: Session, exam_id: int):
    db.query(models.Question).filter(
        models.Question.exam_id == exam_id
    ).delete()
    db.commit()

# ===== CRUD pour Copies =====
def get_copie(db: Session, copie_id: int):
    return db.query(models.CopieEtudiant).filter(
        models.CopieEtudiant.id == copie_id
    ).first()
    
def create_copie(db: Session, copie: schemas.CopieCreate):
    db_copie = models.CopieEtudiant(
        exam_id=copie.exam_id,
        student_id=copie.student_id,
        student_name=copie.student_name,
        contenu_brut=copie.contenu_brut,
        reponses=copie.reponses,
        note=copie.note
    )
    db.add(db_copie)
    db.commit()
    db.refresh(db_copie)
    return db_copie

def get_copies_by_exam(db: Session, exam_id: int):
    return db.query(models.CopieEtudiant).filter(
        models.CopieEtudiant.exam_id == exam_id
    ).all()

def get_copies_by_student(db: Session, student_id: int):
    return db.query(models.CopieEtudiant).filter(
        models.CopieEtudiant.student_id == student_id
    ).all()

def update_copie_note(db: Session, copie_id: int, note: float):
    db_copie = db.query(models.CopieEtudiant).filter(
        models.CopieEtudiant.id == copie_id
    ).first()
    if db_copie:
        db_copie.note = note
        db.commit()
        db.refresh(db_copie)
    return db_copie

