import logging
from pathlib import Path

from flask import Flask, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash

from database import get_database


app = Flask(__name__)
app.secret_key = "local-demo-secret-key"
LOG_DIRECTORY = Path(__file__).resolve().parent / "logs"
LOG_DIRECTORY.mkdir(exist_ok=True)

log_handler = logging.FileHandler(LOG_DIRECTORY / "activity.log")
log_handler.setFormatter(
    logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
)

app.logger.addHandler(log_handler)
app.logger.setLevel(logging.INFO)


@app.get("/")
def index():
    if "user_id" in session:
        return redirect(url_for("profile"))

    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]

        with get_database() as connection:
            user = connection.execute(
                "SELECT * FROM users WHERE username = ?",
                (username,),
            ).fetchone()

        if user and check_password_hash(user["password_hash"], password):
            app.logger.info(
                "Login successful | user=%s | ip=%s",
                user["username"],
                request.remote_addr,
)
            session.clear()
            session["user_id"] = user["id"]
            return redirect(url_for("profile"))

        app.logger.warning(
            "Login failed | username=%s | ip=%s",
            username,
            request.remote_addr,
        )
        
        flash("Incorrect username or password.")

    return render_template("login.html")


@app.get("/profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("login"))

    with get_database() as connection:
        user = connection.execute(
            "SELECT username, email FROM users WHERE id = ?",
            (session["user_id"],),
        ).fetchone()

    return render_template("profile.html", user=user)


@app.post("/change-email")
def change_email():
    if "user_id" not in session:
        return redirect(url_for("login"))

    new_email = request.form["email"].strip()

    if not new_email:
        flash("Email cannot be empty.")
        return redirect(url_for("profile"))

    # INTENTIONALLY VULNERABLE:
    # This endpoint trusts the session cookie without checking a CSRF token. A malicious webpage can therefore submit an email change for a logged-in user.
    with get_database() as connection:
        user = connection.execute(
            "SELECT username, email FROM users WHERE id = ?",
            (session["user_id"],),
        ).fetchone()

        connection.execute(
            "UPDATE users SET email = ? WHERE id = ?",
            (new_email, session["user_id"]),
        )
        connection.commit()

    app.logger.warning(
        "Email change accepted without CSRF token | "
        "user=%s | old_email=%s | new_email=%s | origin=%s | referer=%s",
        user["username"],
        user["email"],
        new_email,
        request.headers.get("Origin", "not provided"),
        request.headers.get("Referer", "not provided"),
    )

    flash("Email updated successfully.")
    return redirect(url_for("profile"))


@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)