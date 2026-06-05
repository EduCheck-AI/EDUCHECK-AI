from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import jwt
from .config import settings

security = HTTPBearer(auto_error=False)


async def verify_token_with_auth_service(token: str) -> dict:
    # verificationn de token
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.AUTH_SERVICE_URL}/auth/verify",
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token invalide ou expiré",
                )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service d'authentification indisponible",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timout de service d'authentification",
        )


def decode_token_locally(token: str) -> dict:
    # decodage de token jwt
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token invalide: {str(e)}"
        )


async def get_current_user_from_cookie(
    request: Request,
) -> dict:
    """Récupère l'utilisateur depuis le cookie (production)"""

    if settings.DEV_MODE:
        return {
            "id": 1,
            "username": "prof_ayman",
            "role": "teacher",
            "email": "prof@educheck.ma",
            "full_name": "Professeur Ayman",
        }

    # RÉCUPÉRER LE TOKEN DEPUIS LE COOKIE
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant",
        )

    try:
        # Vérifier le token localement
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "full_name": payload.get("full_name"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        # Fallback: vérifier auprès de l'auth-service
        return await verify_token_with_auth_service(token)


async def get_current_user(
    request: Request,
) -> dict:
    """Version unifiée - priorité au cookie"""
    return await get_current_user_from_cookie(request)


async def get_current_teacher(
    request: Request, current_user: dict = Depends(get_current_user_from_cookie)
):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Réservé aux enseignants")
    return current_user


async def get_current_student(
    request: Request, current_user: dict = Depends(get_current_user_from_cookie)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Réservé aux étudiants")
    return current_user
