"""Demo data, created at startup when the database is empty.

Everything happens in office hours in India (see seed_time.py): five meetings
over the coming week, one more later today when there's office time left,
and six past sessions.
"""

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import DEFAULT_USER_EMAIL
from app.models import User
from app.seed_rows import add_ended_session, add_meeting
from app.seed_time import TODAY_MINUTES, later_today, office_time, today_in_india
from app.utils.time import utc_now

# (key, name, email, avatar color)
USERS = [
    ("alex", "Alex Morgan", DEFAULT_USER_EMAIL, "#EF6C00"),
    ("priya", "Priya Sharma", "priya.sharma@example.com", "#0E72ED"),
    ("daniel", "Daniel Kim", "daniel.kim@example.com", "#7B3FE4"),
    ("sofia", "Sofia Martinez", "sofia.martinez@example.com", "#00897B"),
    ("rahul", "Rahul Verma", "rahul.verma@example.com", "#D81B60"),
    ("emily", "Emily Chen", "emily.chen@example.com", "#5E35B1"),
]

# Alex's meetings in the coming week: (title, description, days ahead, start in India, minutes)
UPCOMING = [
    ("Sprint Planning", "Choose the stories for the next sprint.", 1, "10:30", 90),
    ("1:1 with Priya", None, 2, "15:00", 30),
    ("Client Demo", "Show the meeting room to the client.", 4, "11:00", 45),
    ("Design Review", "Walk through the new dashboard mockups.", 5, "14:30", 60),
    ("Team Retrospective", None, 6, "16:00", 60),
]


def seed_if_empty(db: Session, now: datetime | None = None) -> bool:
    """Adds the demo data unless there are users already. Returns True if it did.

    Tests pass a fixed `now`; the app uses the current time.
    """
    if db.scalar(select(User.id).limit(1)) is not None:
        return False
    if now is None:
        now = utc_now()
    codes: set[str] = set()  # meeting codes used so far
    users = add_users(db)
    add_upcoming_meetings(db, codes, users["alex"], now)
    add_past_meetings(db, codes, users, today_in_india(now))
    db.commit()
    return True


def add_users(db: Session) -> dict[str, User]:
    users = {}
    for key, name, email, color in USERS:
        users[key] = User(name=name, email=email, avatar_color=color)
        db.add(users[key])
    db.flush()  # gives every user an id
    return users


def add_upcoming_meetings(db: Session, codes: set[str], alex: User, now: datetime) -> None:
    created = now - timedelta(days=1)
    today = today_in_india(now)

    start = later_today(now)
    if start is not None:  # so "Today" isn't empty while there's office time left
        add_meeting(
            db, codes, alex, "Daily Standup",
            created_at=created, start=start, minutes=TODAY_MINUTES,
            description="What we did, what's next, and blockers.",
        )

    for title, description, days, hhmm, minutes in UPCOMING:
        start = office_time(today + timedelta(days=days), hhmm)
        add_meeting(
            db, codes, alex, title,
            created_at=created, start=start, minutes=minutes, description=description,
        )

    # Cancelled meetings aren't listed, but joining this one shows the "cancelled" error.
    start = office_time(today + timedelta(days=3), "12:00")
    cancelled = add_meeting(
        db, codes, alex, "Budget Review", created_at=created, start=start, minutes=30
    )
    cancelled.cancelled_at = now


def add_past_meetings(db: Session, codes: set[str], users: dict[str, User], today: date) -> None:
    alex = users["alex"]
    priya = users["priya"]
    daniel = users["daniel"]
    rahul = users["rahul"]
    emily = users["emily"]

    # Yesterday afternoon: Alex's instant meeting with two guests.
    start = office_time(today - timedelta(days=1), "15:00")
    instant = add_meeting(db, codes, alex, "Alex Morgan's Zoom Meeting", created_at=start)
    add_ended_session(db, instant, start, 25, [alex], ["Jordan Lee", "Maya Patel"])

    # Three days ago: the weekly sync dropped and was restarted, so it has two sessions.
    start = office_time(today - timedelta(days=3), "11:00")
    sync = add_meeting(
        db, codes, alex, "Weekly Team Sync",
        created_at=start - timedelta(days=7), start=start, minutes=60,
        description="Status updates and blockers.",
    )
    add_ended_session(db, sync, start, 20, [alex, priya, rahul], [])
    restart = start + timedelta(minutes=25)
    add_ended_session(db, sync, restart, 35, [alex, priya, rahul], ["Chris Taylor"])

    # Five days ago: Priya hosted, and Alex attended.
    start = office_time(today - timedelta(days=5), "14:00")
    roadmap = add_meeting(
        db, codes, priya, "Product Roadmap Review",
        created_at=start - timedelta(days=2), start=start, minutes=60,
    )
    add_ended_session(db, roadmap, start, 55, [priya, alex, emily], ["Sam Wilson"])

    # A week ago: Daniel's instant meeting with Alex.
    start = office_time(today - timedelta(days=7), "16:30")
    chat = add_meeting(db, codes, daniel, "Daniel Kim's Zoom Meeting", created_at=start)
    add_ended_session(db, chat, start, 15, [daniel, alex], [])

    # Nine days ago: an interview Alex hosted.
    start = office_time(today - timedelta(days=9), "10:30")
    interview = add_meeting(
        db, codes, alex, "Interview: Frontend Engineer",
        created_at=start - timedelta(days=3), start=start, minutes=45,
    )
    add_ended_session(db, interview, start, 40, [alex], ["Taylor Brooks"])
