import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):

    # Database
    DATABASE_URL: str = (
        "postgresql://postgres:postgres123@localhost:5432/gestionetudiant"
    )

    # Services
    AUTH_SERVICE_URL: str = "http://localhost:8000"
    OCR_SERVICE_URL: str = "http://localhost:8003"

    # JWT
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "TTBiwt8soa0W1de9RQgix0-8Rm32VhKF_X81CB1cY4Q"
    )

    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")

    DEV_MODE: bool = False

    # Application
    APP_NAME: str = "Exam Service"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
