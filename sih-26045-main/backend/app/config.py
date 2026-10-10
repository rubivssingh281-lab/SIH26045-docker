import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "backend"
    environment: str = "development"
    debug: bool = False
    database_url: str = "sqlite:///./app.db"
    max_retrieval_results: int = 5

    # LLM settings — local Ollama (gemma4:e4b) by default. Set llm_provider=openai to use Google Gemini (gemini-3.5-flash).
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    llm_model: str = os.getenv("LLM_MODEL", "gemma4:e4b")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    cors_origins: str = os.getenv("CORS_ORIGINS", "*")
    # Cap the KV cache so the model fits in modest RAM regardless of its default context.
    llm_num_ctx: int = int(os.getenv("LLM_NUM_CTX", "4096"))
    llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "300"))

    # Bhashini translation service. Discovery is used unless a direct inference
    # endpoint and service IDs are supplied.
    bhashini_api_key: str = os.getenv("BHASHINI_API_KEY", "")
    bhashini_user_id: str = os.getenv("BHASHINI_USER_ID", "")
    bhashini_pipeline_id: str = os.getenv("BHASHINI_PIPELINE_ID", "")
    bhashini_pipeline_url: str = os.getenv(
        "BHASHINI_PIPELINE_URL",
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
    )
    bhashini_inference_url: str = os.getenv("BHASHINI_INFERENCE_URL", "")
    bhashini_inference_auth_token: str = os.getenv("BHASHINI_INFERENCE_AUTH_TOKEN", "")
    bhashini_inference_auth_header: str = os.getenv("BHASHINI_INFERENCE_AUTH_HEADER", "Authorization")
    bhashini_translation_service_id: str = os.getenv("BHASHINI_TRANSLATION_SERVICE_ID", "")
    bhashini_asr_service_id: str = os.getenv("BHASHINI_ASR_SERVICE_ID", "")
    bhashini_source_language: str = os.getenv("BHASHINI_SOURCE_LANGUAGE", "en")
    bhashini_timeout: float = float(os.getenv("BHASHINI_TIMEOUT", "60"))
    bhashini_max_retries: int = int(os.getenv("BHASHINI_MAX_RETRIES", "3"))
    bhashini_batch_size: int = int(os.getenv("BHASHINI_BATCH_SIZE", "32"))

    secret_key: str = os.getenv("SECRET_KEY", "development-only-change-before-deployment")
    algorithm: str = "HS256"
    # 8 hours — matches the frontend session cookie so a normal work session
    # doesn't silently expire and log the user out. Override via env if needed.
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

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
