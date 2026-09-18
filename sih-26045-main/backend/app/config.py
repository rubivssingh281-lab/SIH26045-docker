import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "backend"
    environment: str = "development"
    debug: bool = False
    database_url: str = "sqlite:///./app.db"
    max_retrieval_results: int = 5

    # LLM settings — local Ollama (gemma4:e4b) by default. Set llm_provider=openai to use OpenAI.
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    llm_model: str = os.getenv("LLM_MODEL", "gemma4:e4b")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    # Cap the KV cache so the model fits in modest RAM regardless of its default context.
    llm_num_ctx: int = int(os.getenv("LLM_NUM_CTX", "4096"))
    llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "300"))

    secret_key: str = os.getenv("SECRET_KEY", "development-only-change-before-deployment")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    mail_username: str = os.getenv("MAIL_USERNAME", "")
    mail_password: str = os.getenv("MAIL_PASSWORD", "")
    mail_from: str = os.getenv("MAIL_FROM", "")
    mail_port: int = int(os.getenv("MAIL_PORT", "587"))
    mail_server: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

    @property
    def mail_configured(self) -> bool:
        return bool(self.mail_username and self.mail_password and self.mail_from)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
