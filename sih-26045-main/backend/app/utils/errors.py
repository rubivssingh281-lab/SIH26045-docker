class BackendError(Exception):
    """Base error for backend-specific failures."""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class ConfigError(BackendError):
    """Raised when there is a configuration issue."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status_code=500, details=details)

class RetrievalError(BackendError):
    """Raised when context retrieval fails."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status_code=500, details=details)

class LLMError(BackendError):
    """Raised when the LLM service fails or returns invalid data."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status_code=502, details=details)
