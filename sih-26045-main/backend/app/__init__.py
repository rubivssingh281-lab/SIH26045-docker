"""Application package for the case analysis backend."""

__all__ = ["create_app"]


def create_app():
    """Lazy app factory keeps pipeline modules importable without web extras."""
    from .main import create_app as factory
    return factory()
