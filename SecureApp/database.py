import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "vuln_app.db"


def get_database():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database():
    DATABASE_PATH.parent.mkdir(exist_ok=True)

    with get_database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            INSERT INTO users (username, password_hash, email)
            VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                email = excluded.email
            """,
            (
                "student",
                generate_password_hash("pass123"),
                "student@example.com",
            ),
        )

        connection.commit()

    print("Database created with the test account.")


if __name__ == "__main__":
    initialise_database()