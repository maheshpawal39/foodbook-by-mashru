import smtplib
from email.message import EmailMessage

from flask import current_app


def send_password_reset_email(to_email: str, name: str, reset_url: str) -> bool:
    host = current_app.config.get("SMTP_HOST")
    if not host:
        current_app.logger.info("Password reset link for %s: %s", to_email, reset_url)
        return False
    message = EmailMessage()
    message["Subject"] = "Reset your FoodieBook password"
    message["From"] = current_app.config["MAIL_FROM"]
    message["To"] = to_email
    message.set_content(
        f"Hello {name},\n\nWe received a request to reset your FoodieBook password.\n"
        f"Open this link to choose a new password (valid for "
        f"{current_app.config['PASSWORD_RESET_TOKEN_MINUTES']} minutes):\n\n{reset_url}\n\n"
        "If you did not request this, you can safely ignore this email.\n\n"
        "FoodieBook by Marshru"
    )
    try:
        with smtplib.SMTP(host, current_app.config["SMTP_PORT"], timeout=15) as smtp:
            smtp.starttls()
            if current_app.config.get("SMTP_USER"):
                smtp.login(current_app.config["SMTP_USER"], current_app.config["SMTP_PASSWORD"])
            smtp.send_message(message)
        return True
    except Exception:
        current_app.logger.exception("Could not send password reset email")
        return False
