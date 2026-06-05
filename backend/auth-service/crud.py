from sqlalchemy.orm import Session
from models import User
from passlib.context import CryptContext
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration du contexte de hachage
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ✅ FONCTION DE TRONCATURE AJOUTÉE
def truncate_password(password: str) -> str:
    """Tronque un mot de passe à 72 bytes si nécessaire"""
    if not password:
        return ""
    password_bytes = password.encode("utf-8")[:72]
    return password_bytes.decode("utf-8")


# ✅ CRUD CORRIGÉ
def create_user(db: Session, user):
    try:
        # ✅ Troncature avant hash
        password_to_hash = truncate_password(user.password)
        hashed_password = pwd_context.hash(password_to_hash)

        db_user = User(
            full_name=user.full_name,
            email=user.email,
            password=hashed_password,
            role=user.role,
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"✅ Utilisateur créé: {user.email}")
        return db_user

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur création: {str(e)}")
        raise e


# ✅ AUTHENTIFICATION CORRIGÉE
def authenticate_user(db: Session, email: str, password: str):
    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            logger.warning(f"❌ Email non trouvé: {email}")
            return None

        # ✅ Troncature avant vérification
        password_to_verify = truncate_password(password)

        if pwd_context.verify(password_to_verify, user.password):
            logger.info(f"✅ Connexion réussie: {email}")
            return user
        else:
            logger.warning(f"❌ Mot de passe incorrect: {email}")
            return None

    except Exception as e:
        logger.error(f"❌ Erreur authentification: {str(e)}")
        return None
