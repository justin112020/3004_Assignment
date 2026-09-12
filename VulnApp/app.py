from flask import Flask, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash

from database import get_database


app = Flask(__name__)
app.secret_key = "local-demo-secret-key"


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
            session.clear()
            session["user_id"] = user["id"]
            return redirect(url_for("profile"))

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


@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)