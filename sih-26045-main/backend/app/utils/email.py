import logging
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from app.config import settings

logger = logging.getLogger(__name__)


def _build_conf():
    """Build the mail connection config lazily; returns None if email isn't configured."""
    if not settings.mail_configured:
        return None
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username,
        MAIL_PASSWORD=settings.mail_password,
        MAIL_FROM=settings.mail_from,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=settings.mail_starttls,
        MAIL_SSL_TLS=settings.mail_ssl_tls,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )

async def send_otp_email(email: EmailStr, otp: str):
    """
    Sends an OTP to the specified email address.
    """
    html = f"""
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>

<body style=" margin:0; padding:0; background-color:#F5F2EB; font-family:Arial, Helvetica, sans-serif; ">
  <!-- Outer wrapper table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style=" background-color:#F5F2EB; padding:20px 0; ">
    <tr>
      <td align="center">

        <!-- Main container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style=" max-width:600px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); ">
          <!-- ================= HEADER ================= -->
          <tr>
            <td style="background-color:#2D4A32; padding:32px 24px; text-align:center;">
              <h1 style=" margin:0; color:#F5F2EB; font-size:28px; font-weight:bold; letter-spacing:1px; ">
                IP-SAKTI Sahayak
              </h1>
              <p style=" margin:8px 0 0; color:#D9CBB8; font-size:16px; ">
                Verify Your Email
              </p>
            </td>
          </tr>

          <!-- ================= BODY ================= -->
          <tr>
            <td style=" background-color:#F5F2EB; padding:32px 24px; ">
              <p style=" margin:0 0 20px; color:#3B3B3B; font-size:16px; line-height:1.6; ">
                Hello,
              </p>
              <p style=" margin:0 0 20px; color:#3B3B3B; font-size:16px; line-height:1.6; ">
                To complete your registration, please use
                the verification code below. This code is
                valid for <strong>10 minutes</strong>.
              </p>

              <!-- ================= OTP BOX (no copy button) ================= -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style=" background-color:#E8E0D5; border-radius:8px; padding:20px; text-align:center; ">
                    <span style=" font-size:32px; font-weight:bold; letter-spacing:8px; color:#2D4A32; font-family:monospace; ">
                      {otp}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Security message -->
              <p style=" margin:0 0 20px; color:#3B3B3B; font-size:14px; line-height:1.6; ">
                If you did not request this code,
                please ignore this email.
              </p>
            </td>
          </tr>
          <!-- ================= FOOTER ================= -->
          <tr>
            <td style=" background-color:#3E6045; padding:16px 24px; text-align:center; ">
              <p style=" margin:0; color:#F5F2EB; font-size:12px; ">
                &copy; 2026 IP-SAKTI Sahayak.
                All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    """

    conf = _build_conf()
    if conf is None:
        logger.warning("Email not configured (set MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM in backend/.env). "
                       f"[OTP FALLBACK] Verification code for {email} is: {otp}")
        return

    message = MessageSchema(
        subject="Your OTP Verification Code",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"OTP email sent to {email} via FastMail")
        return
    except Exception as e:
        logger.warning(f"FastMail failed ({e}), trying standard smtplib fallback...")
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Your OTP Verification Code - IP-SAKTI Sahayak"
            msg["From"] = settings.mail_from
            msg["To"] = str(email)
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(settings.mail_server, settings.mail_port, timeout=15) as s:
                s.starttls()
                s.login(settings.mail_username, settings.mail_password)
                s.send_message(msg)
            logger.info(f"OTP email sent to {email} via standard smtplib")
            return
        except Exception as smtperr:
            logger.error(f"Failed to send email to {email}: {smtperr}")
            logger.warning(f"[OTP FALLBACK] Email delivery failed — verification code for {email} is: {otp}")
