from sqlalchemy import Column, Integer, String
from database import Base

# Modèle de données pour les utilisateurs (étudiants et enseignants)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)