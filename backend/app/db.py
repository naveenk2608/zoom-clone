"""Database engine, sessions and the declarative base."""

from collections.abc import Iterator
from sqlite3 import Connection as SQLiteConnection

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import ConnectionPoolEntry

from app.config import settings


class Base(DeclarativeBase):
    pass


def create_db_engine(url: str) -> Engine:
    """A SQLite engine with the settings this app relies on. Tests use it too."""
    # FastAPI runs sync endpoints in worker threads, so a connection may be
    # used by a different thread than the one that opened it.
    engine = create_engine(url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", set_sqlite_pragmas)
    return engine


def set_sqlite_pragmas(
    dbapi_connection: SQLiteConnection, connection_record: ConnectionPoolEntry
) -> None:
    """Runs on every new connection."""
    cursor = dbapi_connection.cursor()
    # SQLite ignores foreign keys unless this is switched on for each connection.
    cursor.execute("PRAGMA foreign_keys=ON")
    # Write-ahead logging lets readers keep reading while a write is in progress.
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


engine = create_db_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, closed afterwards."""
    with SessionLocal() as session:
        yield session


def get_session_factory() -> sessionmaker[Session]:
    """FastAPI dependency for WebSockets, which live for minutes.

    A socket opens a short session for each database step instead of holding
    one for its whole life. Tests replace this with the test database's factory.
    """
    return SessionLocal
