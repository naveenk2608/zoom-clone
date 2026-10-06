from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.db import create_db_engine, get_db
from app.deps import DEFAULT_USER_EMAIL
from app.main import app
from app.models import User, create_tables


@pytest.fixture
def session_factory(tmp_path: Path) -> Iterator[sessionmaker[Session]]:
    """A fresh SQLite file for every test."""
    engine = create_db_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    create_tables(engine)
    yield sessionmaker(bind=engine)
    engine.dispose()


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    """A session for setting up data and checking results."""
    with session_factory() as session:
        yield session


@pytest.fixture
def alex(db: Session) -> User:
    """The default user, who is always signed in."""
    user = User(name="Alex Morgan", email=DEFAULT_USER_EMAIL, avatar_color="#EF6C00")
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def client(session_factory: sessionmaker[Session], alex: User) -> Iterator[TestClient]:
    """Calls the app with its database swapped for the test database.

    Each request gets its own session, as in production, so a missing commit
    shows up as a failing test.
    """

    def test_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = test_db
    yield TestClient(app)
    app.dependency_overrides.clear()
