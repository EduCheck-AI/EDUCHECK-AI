from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/gestionetudiant")
# engine est l'objet qui gère la connexion à la base de données
engine = create_engine(DATABASE_URL)
# SessionLocal est une classe qui permet de créer des sessions de base de données
SessionLocal = sessionmaker(bind=engine)
# Base est la classe de base pour les modèles de données SQLAlchemy
Base = declarative_base()