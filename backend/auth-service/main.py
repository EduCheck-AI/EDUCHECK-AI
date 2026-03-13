from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, engine, Base
import models, schemas, crud

# Créer les tables
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

# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# REGISTER
@app.post("/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        crud.create_user(db, user)
        return {"message": "Compte créé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# LOGIN
@app.post("/auth/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    try:
        user = crud.authenticate_user(db, data.email, data.password)
        if not user:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        return {
        "message": "Connexion réussie",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))