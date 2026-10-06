"""Time helpers. The database stores naive UTC; the rest of the app uses aware UTC datetimes."""

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import DateTime
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    """A DATETIME column that always holds UTC.

    SQLite has no timezone-aware type, so values are stored as naive UTC
    and come back as aware UTC datetimes.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Naive datetime: use an aware one, such as utc_now()")
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc)


def local_to_utc(day: date, hhmm: str, timezone_name: str) -> datetime:
    """Turns a wall-clock date and "HH:MM" in an IANA time zone into UTC.

    zoneinfo applies the offset in force on that day, so daylight saving is handled.
    """
    wall_clock = datetime.combine(day, time.fromisoformat(hhmm), tzinfo=ZoneInfo(timezone_name))
    return wall_clock.astimezone(timezone.utc)


def utc_to_local(moment: datetime, timezone_name: str) -> datetime:
    return moment.astimezone(ZoneInfo(timezone_name))


def is_valid_timezone(name: str) -> bool:
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        # OSError: a folder name such as "America" exists in the database but is not a zone.
        return False
    return True
