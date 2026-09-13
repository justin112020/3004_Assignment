# CSRF Demo Login
Deliberately vulnerable Flask application used to demonstrate CSRF.

## Stack
* Python 3
* Flask
* SQLite
* HTML
* Werkzeug password hashing

## Test Account
* Username: `student`
* Password: `pass123`
* Initial email: `student@example.com`
* Attack email: `attacker@example.com`

## Run the App
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python database.py
python app.py
```

Open `http://127.0.0.1:5000` and log in.



## For Sid - Malicious Page Requirements
* Target: `http://127.0.0.1:5000/change-email`
* Method: `POST`
* Field name: `email`
* Field value: `attacker@example.com`
* Victim must already be logged in
* No CSRF token is required
* Use a standard hidden HTML form
* Use `127.0.0.1`, not `localhost`

Expected result: visiting the malicious page changes the logged-in account’s email from `student@example.com` to `attacker@example.com`.

Activity logs are stored in `logs\activity.log` in the project folder. 



## For Gina - CSRF Mitigation Requirements
* Copy `VulnApp` into a separate `SecureApp` folder
* Modify the `/change-email` route in `app.py`
* Validate a CSRF token before updating the database
* Add the token as a hidden field in `templates/profile.html`
* Keep the endpoint, POST method and `email` field unchanged
* Do not modify the original vulnerable application

Expected result: legitimate email changes still work, but Sid’s malicious page is rejected and the email remains unchanged.