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


async def get_current_user_from_cookie(request: Request) -> dict:
    print("=" * 50)
    print("🔍 get_current_user_from_cookie appelée")
    print("🍪 Cookies:", dict(request.cookies))
    
    user_id = request.cookies.get("user_id")
    user_role = request.cookies.get("user_role")
    
    print(f"📌 user_id = {user_id}")
    print(f"📌 user_role = '{user_role}'")
    print("=" * 50)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Non connecté")
    
    return {
        "id": int(user_id),
        "role": user_role,
        "full_name": request.cookies.get("user_name"),
        "email": request.cookies.get("user_email"),
    }
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
