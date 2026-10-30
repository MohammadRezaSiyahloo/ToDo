from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    SECRET_KEY: str = Field(min_length=32)
    DATABASE_URL: str = "sqlite:///./todoapp.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440, gt=0)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    FORCE_HTTPS: bool = False


settings = Settings()
