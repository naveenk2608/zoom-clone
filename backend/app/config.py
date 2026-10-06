from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./zoom_clone.db"
    frontend_base_url: str = "http://localhost:3000"
    # Comma-separated, e.g. "https://zoom-clone.vercel.app,http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS_ORIGINS as a list, with spaces and empty entries removed."""
        origins = [origin.strip() for origin in self.cors_origins.split(",")]
        return [origin for origin in origins if origin]


settings = Settings()
