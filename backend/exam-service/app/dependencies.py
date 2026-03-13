from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from .config import settings

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    MODE DÉVELOPPEMENT - Retourne un utilisateur fictif
    """
    # Mode développement : utilisateur fictif
    return {
        "id": 1,
        "username": "prof_ayman",
        "role": "teacher",
        "email": "prof@educheck.ma"
    }
    
    # Code réel (à activer en production)
    """
    token = credentials.credentials
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.AUTH_SERVICE_URL}/users/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token invalide"
                )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service d'authentification indisponible"
        )
    """

def get_current_teacher(current_user: dict = Depends(get_current_user)):
    """Vérifie que l'utilisateur est un enseignant"""
    # En mode développement, on accepte tout
    return current_user
    
    # Code réel (à activer en production)
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les enseignants peuvent effectuer cette action"
        )
    return current_user
    """