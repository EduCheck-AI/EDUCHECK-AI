"""
NOTIFICATION SERVICE - Port 8004
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

app = FastAPI(title="Notification Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 CONFIGURATION EMAIL (depuis votre Laravel .env)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "aoudanesoukaina@gmail.com"
SMTP_PASSWORD = "buwz ykqz gwkf hzwn"

class EmailResultatRequest(BaseModel):
    to_email: str
    student_name: str
    exam_title: str
    note: float
    total: float
    pourcentage: float
    feedback_url: Optional[str] = None

@app.post("/notifications/email/resultat")
async def envoyer_email_resultat(req: EmailResultatRequest):
    """Envoie un email à l'étudiant avec son résultat"""
    try:
        mention = "✅ Félicitations !" if req.pourcentage >= 50 else "📚 À améliorer"
        couleur = "#22c55e" if req.pourcentage >= 50 else "#ef4444"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Résultat examen</title>
        </head>
        <body style="font-family: Arial, sans-serif; background: #f4f6f9; padding: 20px;">
            <div style="max-width: 550px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">📝 EduCheck AI</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9;">Correction intelligente</p>
                </div>
                
                <div style="padding: 24px;">
                    <h2 style="margin: 0 0 8px; color: #1e293b;">Bonjour {req.student_name},</h2>
                    <p style="color: #475569; margin-bottom: 24px;">Votre copie pour l'examen <strong>"{req.exam_title}"</strong> a été corrigée.</p>
                    
                    <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 16px;">
                        <span style="font-size: 42px; font-weight: 700; color: {couleur};">{req.note} / {req.total}</span>
                        <p style="color: {couleur}; font-weight: 500; margin: 8px 0 0;">{mention} ({req.pourcentage:.1f}%)</p>
                    </div>
                    
                    {f'<div style="text-align: center; margin-top: 24px;"><a href="{req.feedback_url}" style="background: #6366f1; color: white; padding: 10px 24px; text-decoration: none; border-radius: 30px;">📖 Voir le feedback détaillé</a></div>' if req.feedback_url else ''}
                </div>
                
                <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                    © 2026 EduCheck AI - Correction automatique par intelligence artificielle
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg["From"] = SMTP_USER
        msg["To"] = req.to_email
        msg["Subject"] = f"📝 Votre résultat pour {req.exam_title}"
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return {"success": True, "message": "Email envoyé"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service"}

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("📧 Notification Service démarré")
    print(f"   Email expéditeur: {SMTP_USER}")
    print("   Port: 8004")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8004)