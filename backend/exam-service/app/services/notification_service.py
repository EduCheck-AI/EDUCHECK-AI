"""
Service de notification - Appelle le service externe (port 8004)
"""

import httpx

NOTIFICATION_SERVICE_URL = "http://localhost:8004"

async def envoyer_notification_email(
    student_email: str,
    student_name: str,
    exam_title: str,
    note: float,
    total: float,
    copie_id: int
):
    """Envoie une notification par email à l'étudiant"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            pourcentage = (note / total) * 100 if total > 0 else 0
            
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notifications/email/resultat",
                json={
                    "to_email": student_email,
                    "student_name": student_name,
                    "exam_title": exam_title,
                    "note": note,
                    "total": total,
                    "pourcentage": round(pourcentage, 1),
                    "feedback_url": f"http://localhost:3000/corrections/{copie_id}"
                }
            )
            print(f"📧 Notification envoyée à {student_email}")
            return True
    except httpx.ConnectError:
        print(f"⚠️ Service notification indisponible (port 8004)")
        return False
    except Exception as e:
        print(f"⚠️ Erreur envoi notification: {e}")
        return False