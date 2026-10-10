from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.api.auth import router as auth_router
from app.api.cases import router as cases_router
from app.api.assistant import router as assistant_router
from app.api.translate import router as translate_router
from app.api.jurisdiction_diff import router as jurisdiction_diff_router
from app.api.agent_api import router as agent_router
from app.api.connectors import router as connectors_router
from app.config import settings
from sqlalchemy import inspect, text
from app.db import engine
from app import models

models.Base.metadata.create_all(bind=engine)

# SQLite's create_all does not add fields to an existing developer database.
# Keep this narrowly scoped compatibility migration until formal migrations are added.
if "extracted_facts" in inspect(engine).get_table_names():
    columns = {column["name"] for column in inspect(engine).get_columns("extracted_facts")}
    if "source_span" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE extracted_facts ADD COLUMN source_span TEXT"))

if "formulation_submissions" in inspect(engine).get_table_names():
    columns = {column["name"] for column in inspect(engine).get_columns("formulation_submissions")}
    if "tool" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE formulation_submissions ADD COLUMN tool TEXT"))
            connection.execute(text("ALTER TABLE formulation_submissions ADD COLUMN tool_input TEXT"))


def create_app() -> FastAPI:
    app = FastAPI(title="SIH 2026 Patent Formulation API", version="0.1.0")

    # CORS settings: allows localhost and any deployed frontend (Vercel, HF Spaces, etc.)
    cors_origins_val = (getattr(settings, "cors_origins", "") or "*").strip()
    if cors_origins_val == "*":
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=r"^https?://.*",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        origins = [o.strip() for o in cors_origins_val.split(",") if o.strip()]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router)
    app.include_router(auth_router)
    app.include_router(cases_router)
    app.include_router(assistant_router)
    app.include_router(translate_router)
    app.include_router(jurisdiction_diff_router)
    app.include_router(agent_router)
    app.include_router(connectors_router)

    @app.get("/")
    def root():
        return {"message": "SIH 2026 Patent Formulation API is running"}

    return app


app = create_app()
