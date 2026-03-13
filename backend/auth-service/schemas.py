from pydantic import BaseModel

# Schéma de données pour la création d'un utilisateur (étudiant ou enseignant)
class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str

# Schéma de données pour la connexion d'un utilisateur
class UserLogin(BaseModel):
    email: str
    password: str