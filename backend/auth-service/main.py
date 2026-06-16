from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, engine, Base
import models, schemas, crud

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/auth/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    response = JSONResponse(
        content={
            "message": "Connexion réussie",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
        }
    )

    response.set_cookie(
        key="user_id", value=str(user.id), httponly=False, samesite="lax"
    )
    response.set_cookie(
        key="user_role", value=user.role, httponly=False, samesite="lax"
    )
    response.set_cookie(
        key="user_name", value=user.full_name, httponly=False, samesite="lax"
    )
    response.set_cookie(
        key="user_email", value=user.email, httponly=False, samesite="lax"
    )
    return response


@app.post("/auth/logout")
def logout():
    response = JSONResponse(content={"message": "Déconnecté"})
    response.delete_cookie("user_id")
    response.delete_cookie("user_role")
    response.delete_cookie("user_name")
    response.delete_cookie("user_email")
    return response


@app.get("/auth/me")
def get_me(request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Non connecté")
    return {
        "id": int(user_id),
        "role": request.cookies.get("user_role"),
        "full_name": request.cookies.get("user_name"),
        "email": request.cookies.get("user_email"),
    }



@app.post("/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = (
        db.query(models.User).filter(models.User.email == user.email).first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    crud.create_user(db, user)
    return {"message": "Compte créé avec succès"}

@app.get("/auth/students")
def get_all_students(db: Session = Depends(get_db)):
    students = db.query(models.User).filter(models.User.role == "student").all()
    return [
        {
            "id": s.id,"full_name": s.full_name, "email": s.email
        }
        for s in students
    ]

@app.get("/auth/students/by-email")
async def get_student_by_email(email: str, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.role == "student", models.User.email == email).first()
    if not student:
        raise HTTPException(404, "Etudiant non trouvé")
    return {"id": student.id, "full_name": student.full_name, "email": student.email}


@app.get("/auth/students/search")
def search_students(q: str, db: Session = Depends(get_db)):
    students = db.query(models.User).filter(
        models.User.role == "student",
        (models.User.full_name.ilike(f"%{q}%") | models.User.email.ilike(f"%{q}%"))
    ).limit(20).all()
    return [
        {"id": s.id, "full_name": s.full_name, "email": s.email}
        for s in students
    ]

    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)