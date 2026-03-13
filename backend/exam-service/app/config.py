from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@localhost:5432/gestionetudiant"
    
    # Services
    AUTH_SERVICE_URL: str = "http://localhost:8001"
    OCR_SERVICE_URL: str = "http://localhost:8003"
    
    # Application
    APP_NAME: str = "Exam Service"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()