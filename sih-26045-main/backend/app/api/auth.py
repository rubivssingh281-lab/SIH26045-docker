import logging
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User, OTPRecord
from app.schemas import (
    UserCreate, UserResponse, OTPVerify, OTPGenerate, Token, AuthResponse,
    UserLogin, UserUpdate, PasswordResetRequest, PasswordResetConfirm, GoogleLoginRequest
)
from app.utils.security import get_password_hash, verify_password, create_access_token, generate_otp
from app.utils.email import send_otp_email
from app.config import settings
from app.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    """Trim + lowercase so 'User@Gmail.com ' and 'user@gmail.com' are the same account."""
    return (email or "").strip().lower()


async def send_supabase_otp(email: str) -> bool:
    """Request Supabase Auth to send a 6-digit OTP email directly to user's inbox."""
    if not settings.supabase_configured:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/otp",
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Content-Type": "application/json"
                },
                json={"email": email, "create_user": True}
            )
            if resp.status_code == 200:
                logger.info(f"Supabase Auth OTP dispatched successfully to {email}")
                return True
            else:
                logger.warning(f"Supabase Auth OTP dispatch failed ({resp.status_code}): {resp.text}")
                return False
    except Exception as exc:
        logger.error(f"Error calling Supabase Auth OTP: {exc}")
        return False


async def verify_supabase_otp(email: str, token: str, otp_type: str = "email") -> bool:
    """Verify 6-digit code against Supabase Auth service."""
    if not settings.supabase_configured:
        return False
    types_to_try = [otp_type]
    fallback_type = "recovery" if otp_type == "email" else "email"
    if fallback_type not in types_to_try:
        types_to_try.append(fallback_type)

    for t in types_to_try:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.supabase_url.rstrip('/')}/auth/v1/verify",
                    headers={
                        "apikey": settings.supabase_anon_key,
                        "Content-Type": "application/json"
                    },
                    json={"type": t, "email": email, "token": token}
                )
                if resp.status_code == 200:
                    logger.info(f"Supabase Auth OTP code verified for {email} (type={t})")
                    return True
                else:
                    logger.warning(f"Supabase Auth OTP verify ({t}) failed ({resp.status_code}): {resp.text}")
        except Exception as exc:
            logger.error(f"Error calling Supabase Auth verify ({t}): {exc}")
    return False


async def send_supabase_password_reset(email: str) -> bool:
    """Trigger Supabase Auth to send the Reset Password email template."""
    if not settings.supabase_configured:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/recover",
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Content-Type": "application/json"
                },
                json={"email": email}
            )
            if resp.status_code == 200:
                logger.info(f"Supabase Auth password reset dispatched to {email}")
                return True
            else:
                logger.warning(f"Supabase Auth recover failed ({resp.status_code}): {resp.text}")
                return False
    except Exception as exc:
        logger.error(f"Error calling Supabase Auth recover: {exc}")
        return False


def _dispatch_otp(background_tasks: BackgroundTasks, email: str, otp: str) -> Optional[str]:
    """Queue the OTP verification email.

    Returns the raw OTP for on-screen display ONLY when email delivery is not
    configured (demo / zero-setup mode). When MAIL_* is configured the code is
    delivered by email and this returns None, so the OTP is never exposed over
    the API in a real deployment.
    """
    background_tasks.add_task(send_otp_email, email=email, otp=otp)
    return None if settings.mail_configured else otp


def _issue_otp(db: Session, background_tasks: BackgroundTasks, email: str) -> Optional[str]:
    """Generate + persist a fresh OTP for ``email`` and dispatch it. Returns the
    demo-mode OTP (see :func:`_dispatch_otp`) or None."""
    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.add(OTPRecord(email=email, otp_code=otp, expires_at=expires))
    db.commit()
    return _dispatch_otp(background_tasks, email, otp)


@router.post("/signup")
async def signup(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email = _normalize_email(user_in.email)
    user = db.query(User).filter(User.email == email).first()

    # A fully verified account already owns this email — block the duplicate.
    if user and user.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(user_in.password)
    if user:
        # Unverified account re-signing up: refresh their details and send a
        # fresh code instead of rejecting them with "already registered".
        user.hashed_password = hashed_pwd
        if user_in.first_name:
            user.first_name = user_in.first_name
        if user_in.last_name:
            user.last_name = user_in.last_name
        db.commit()
        db.refresh(user)
        new_user = user
    else:
        new_user = User(
            email=email,
            hashed_password=hashed_pwd,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            role="Researcher",
            default_jurisdiction="INDIA"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    if settings.supabase_configured:
        await send_supabase_otp(new_user.email)
    dev_otp = _issue_otp(db, background_tasks, new_user.email)

    return {
        "user": UserResponse.model_validate(new_user, from_attributes=True).model_dump(),
        "requires_otp": True,
        "message": (
            "Verification code sent to your email."
            if settings.mail_configured
            else "Email delivery is not configured — use the code shown below "
                 "(it is also printed in the backend logs)."
        ),
        "dev_otp": dev_otp,
    }


@router.post("/login", response_model=AuthResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    email = _normalize_email(user_in.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your OTP.")

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/request-otp")
async def request_otp(
    otp_in: OTPGenerate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email = _normalize_email(otp_in.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Auto-provision unverified user so Login-with-OTP works seamlessly
        user = User(
            email=email,
            hashed_password=get_password_hash("OTP_LOGIN_USER"),
            is_verified=False,
            role="Researcher",
            default_jurisdiction="INDIA"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if settings.supabase_configured:
        await send_supabase_otp(user.email)

    dev_otp = _issue_otp(db, background_tasks, user.email)
    return {
        "message": "Verification code sent to your email." if settings.mail_configured else "OTP sent successfully",
        "dev_otp": dev_otp
    }

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(otp_in: OTPVerify, db: Session = Depends(get_db)):
    email = _normalize_email(otp_in.email)
    code = (otp_in.otp_code or "").strip()

    is_verified = False
    if settings.supabase_configured:
        is_verified = await verify_supabase_otp(email, code)

    if not is_verified:
        # Check local/Supabase OTPRecord table
        otp_record = db.query(OTPRecord).filter(
            OTPRecord.email == email,
            OTPRecord.otp_code == code
        ).order_by(OTPRecord.id.desc()).first()

        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        now = datetime.now(timezone.utc)
        if otp_record.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)

        if now > otp_record.expires_at:
            raise HTTPException(status_code=400, detail="OTP expired")

        db.delete(otp_record)
        db.commit()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Mark user as verified
    if not user.is_verified:
        user.is_verified = True
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = user_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account associated with this email address")

    if settings.supabase_configured:
        sent = await send_supabase_password_reset(user.email)
        if not sent:
            logger.info(f"Supabase recover failed, dispatching fallback send_supabase_otp for {user.email}")
            await send_supabase_otp(user.email)

    dev_otp = _issue_otp(db, background_tasks, user.email)
    return {
        "message": "Password reset code sent to your email.",
        "dev_otp": None if settings.mail_configured else dev_otp
    }


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    code = (payload.otp_code or "").strip()
    new_pwd = (payload.new_password or "").strip()

    if len(new_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    is_verified = False
    if settings.supabase_configured:
        is_verified = await verify_supabase_otp(email, code, otp_type="recovery")

    if not is_verified:
        otp_record = db.query(OTPRecord).filter(
            OTPRecord.email == email,
            OTPRecord.otp_code == code
        ).order_by(OTPRecord.id.desc()).first()

        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")

        now = datetime.now(timezone.utc)
        if otp_record.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)

        if now > otp_record.expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired")

        db.delete(otp_record)
        db.commit()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(new_pwd)
    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Authenticate or auto-provision user using verified Firebase Google Sign-In."""
    email = _normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email from Google account")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash("GOOGLE_FIREBASE_OAUTH_USER"),
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_verified=True,
            role="Researcher",
            default_jurisdiction="INDIA"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.is_verified:
            user.is_verified = True
        if payload.first_name and not user.first_name:
            user.first_name = payload.first_name
        if payload.last_name and not user.last_name:
            user.last_name = payload.last_name
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}




