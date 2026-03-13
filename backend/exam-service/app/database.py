from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from .config import settings

# Connexion à PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# Créer le schéma exam s'il n'existe pas
with engine.connect() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS exam"))
    conn.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()