from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.db import create_db_engine, get_db, get_session_factory
from app.deps import DEFAULT_USER_EMAIL
from app.main import app
from app.models import User, create_tables
from app.realtime.connection_manager import ConnectionManager


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


@pytest.fixture
def live_client(
    session_factory: sessionmaker[Session], alex: User, monkeypatch: pytest.MonkeyPatch
) -> Iterator[TestClient]:
    """Like `client`, but runs the app startup and keeps every WebSocket on one event loop.

    That is how the real server works: the connection manager and its locks are
    shared by all sockets. Without `with`, each socket would get its own loop.
    """

    def test_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    # Startup creates tables and seeds, so point it at the test database too.
    monkeypatch.setattr("app.main.engine", session_factory.kw["bind"])
    monkeypatch.setattr("app.main.SessionLocal", session_factory)
    monkeypatch.setattr("app.realtime.actions.manager", ConnectionManager())
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
