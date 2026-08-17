from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    fpl_api_base_url: str = "https://fantasy.premierleague.com/api"
    database_url: str = "sqlite:///./fpl_assistant.db"
    cache_ttl_seconds: int = 3600
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
