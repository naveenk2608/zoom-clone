from datetime import datetime

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.utils.time import UTCDateTime, utc_now


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    avatar_color: Mapped[str] = mapped_column(Text)  # hex color for initials avatars, e.g. "#EF6C00"
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
