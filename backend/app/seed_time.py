"""When the demo meetings happen: office hours in India, relative to today."""

from datetime import date, datetime, timedelta

from app.utils.time import local_to_utc, utc_to_local

SEED_TIMEZONE = "Asia/Kolkata"
OFFICE_OPENS = "10:00"
OFFICE_CLOSES = "18:00"
TODAY_MINUTES = 30  # length of the meeting added later today


def today_in_india(now: datetime) -> date:
    return utc_to_local(now, SEED_TIMEZONE).date()


def office_time(day: date, hhmm: str) -> datetime:
    """A wall-clock time in India on the given day, as UTC."""
    return local_to_utc(day, hhmm, SEED_TIMEZONE)


def later_today(now: datetime) -> datetime | None:
    """The next :00 or :30 in today's office hours, or None when a meeting
    would no longer finish by closing time."""
    today = today_in_india(now)
    # India is UTC+5:30, so :00 and :30 in UTC are also :00 and :30 there.
    start = max(next_half_hour(now), office_time(today, OFFICE_OPENS))
    if start + timedelta(minutes=TODAY_MINUTES) > office_time(today, OFFICE_CLOSES):
        return None
    return start


def next_half_hour(moment: datetime) -> datetime:
    rounded = moment.replace(minute=0, second=0, microsecond=0)
    while rounded <= moment:
        rounded += timedelta(minutes=30)
    return rounded
