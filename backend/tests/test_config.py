from app.config import Settings


def test_cors_origins_are_split_on_commas() -> None:
    settings = Settings(cors_origins=" https://a.example , http://localhost:3000,")

    assert settings.cors_origin_list == ["https://a.example", "http://localhost:3000"]
