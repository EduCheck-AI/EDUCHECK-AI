from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, engine, Base
import models, schemas, crud

# Créer les tables automatiquement dans la base de données
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS pour React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Dependance pour obtenir une session de base de données
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# REGISTER pour créer un compte
@app.post("/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        # Vérifier si l'utilisateur existe déjà
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            # Lancer une exception HTTP 400 si l'email est déjà utilisé
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        crud.create_user(db, user)
        return {"message": "Compte créé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# LOGIN pour se connecter et vérifier les identifiants
@app.post("/auth/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    try:
        # Authentifier l'utilisateur
        user = crud.authenticate_user(db, data.email, data.password)
        if not user:
            # Lancer une exception HTTP 401 si les identifiants sont incorrects
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        return {
        "message": "Connexion réussie",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }
# Gérer les exceptions inattendues
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))