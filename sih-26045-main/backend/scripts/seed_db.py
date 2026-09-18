from app.db import Base, engine
from app.models import AnalysisResult, CaseRecord


def seed_db():
    Base.metadata.create_all(bind=engine)
    print("Database schema created.")


if __name__ == "__main__":
    seed_db()
