import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..main import app
# from app.db.session import Base, get_db


# ---- Create an in-memory test DB ----
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---- Override DB dependency ----
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def test_app() -> FastAPI:
    """Provide a FastAPI application with test DB overrides."""
    # Base.metadata.create_all(bind=engine)
    return app


@pytest.fixture
async def client(test_app: FastAPI):
    """Async test client."""
    async with AsyncClient(app=test_app, base_url="http://testserver") as c:
        yield c
