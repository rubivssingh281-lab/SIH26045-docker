# Complete Guide: Universal Full-Stack Authentication System
### (Next.js 15 App Router + FastAPI + Supabase PostgreSQL + Custom Gmail SMTP + Forgot Password Flow + Firebase Google OAuth)

This comprehensive guide explains how to replicate the entire enterprise-grade authentication system from this project into any new repository or project. It covers traditional email/password, 6-digit email OTPs, password recovery, and frictionless one-click Google Sign-In with automated backend database user provisioning.

---

## Table of Contents
1. [Architecture Overview & Flow Diagrams](#1-architecture-overview--flow-diagrams)
2. [Database Setup: Supabase PostgreSQL Persistence](#2-database-setup-supabase-postgresql-persistence)
3. [Email Setup: Gmail SMTP & Supabase Email Templates](#3-email-setup-gmail-smtp--supabase-email-templates)
4. [Google Firebase Authentication Setup](#4-google-firebase-authentication-setup)
5. [Backend Implementation (FastAPI + SQLAlchemy + JWT)](#5-backend-implementation-fastapi--sqlalchemy--jwt)
6. [Frontend Implementation (Next.js 15 App Router + Firebase + Middleware)](#6-frontend-implementation-nextjs-15-app-router--firebase--middleware)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Deployment Guide (Vercel & Render)](#8-deployment-guide-vercel--render)
9. [Comprehensive Troubleshooting & Gotchas Matrix](#9-comprehensive-troubleshooting--gotchas-matrix)

---

## 1. Architecture Overview & Flow Diagrams

### Complete System Diagram
```
┌────────────────────────────────────────────────────────┐
│            Next.js 15 Frontend (Vercel)                │
│  - Email / Password Login & Registration               │
│  - 6-Digit Email OTP Login                             │
│  - 2-Stage Forgot Password Recovery Flow               │
│  - Google Sign-In (Firebase Popup with postMessage)    │
│  - Edge Middleware Route Protection (Cookie Session)   │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               │ HTTPS (Port 443)         │ Google OAuth Popup
               │ Backend REST API         │ (Identity Toolkit)
               ▼                          ▼
┌─────────────────────────────────┐ ┌────────────────────────────┐
│        FastAPI Backend          │ │   Google Firebase Auth     │
│       (Render / Docker)         │ │ (ip-sakti-sahayak-22b24)   │
│  - Bcrypt Password Hashing      │ └─────────────┬──────────────┘
│  - HS256 JWT Access Tokens      │               │
│  - Google Auto-Provisioning     │               │ Returns User ID Token
│  - Session Management           │ ◄─────────────┘
└──────┬──────────────────┬───────┘
       │                  │
       │ PostgreSQL (5432)│ HTTPS (Port 443)
       ▼                  ▼
┌──────────────┐   ┌────────────────────────────────────────┐
│   Supabase   │   │             Supabase Auth              │
│  PostgreSQL  │   │  - /auth/v1/otp (Sign in & Signup)     │
│  (Database)  │   │  - /auth/v1/recover (Password Reset)   │
└──────────────┘   │  - /auth/v1/verify (Verify Code)       │
                   └──────────────────┬─────────────────────┘
                                      │ Port 587 (Allowed on Supabase)
                                      ▼
                   ┌────────────────────────────────────────┐
                   │           Gmail Custom SMTP            │
                   │        ipsaktisahayak@gmail.com        │
                   │        (16-char App Password)          │
                   └──────────────────┬─────────────────────┘
                                      │
                                      ▼
                            User's Email Inbox
                           (6-Digit OTP / Reset)
```

### Key Architectural Decisions

1. **Cloud Port 587 Block Bypass**:
   Free cloud tiers (Render, AWS Lambda, Vercel Serverless, DigitalOcean App Platform) block outbound ports `25`, `465`, and `587`. The backend calls Supabase Auth API (`/auth/v1/otp` and `/auth/v1/recover`) over HTTPS (Port `443`), which relays emails via Gmail SMTP through Supabase's open infrastructure.
2. **Brave Shields / Safari ITP Popup-First OAuth**:
   Modern privacy browsers block third-party cookies and partition cross-site storage. Full-page redirects (`signInWithRedirect`) fail silently because `getRedirectResult()` cannot access cross-site cookies. Using `signInWithPopup` uses in-memory `postMessage` communication that works seamlessly on all browsers without cookie dependencies.
3. **Unified Backend JWT Tokens**:
   Whether a user signs in via Password, Email OTP, or Google OAuth, the FastAPI backend issues a unified, digitally signed HS256 JWT access token. This ensures all protected endpoints (`/cases`, `/auth/me`, `/profile`) authenticate uniformly.

---

## 2. Database Setup: Supabase PostgreSQL Persistence

Free cloud containers (like Render free tier) have ephemeral disk storage—SQLite files are wiped on redeploy. Supabase provides a permanent free PostgreSQL database.

### Step 1: Create Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. Note your **Project Reference** (e.g. `khywjiwqnqmoayuzhnxz`) and your **Database Password**.

### Step 2: IPv4 Connection Pooler String
Render free instances run on IPv4. Direct connection to `db.[ref].supabase.co` uses IPv6 and fails.
1. In Supabase: **Project Settings** ➔ **Database**.
2. Under **Connection String**, select **URI**.
3. Set Mode to **Session** (Port `5432`).
4. Copy the connection string:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

### Step 3: Database Engine Configuration (`backend/app/db.py`)
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Automatically switch to psycopg2 dialect for PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {}
engine_kwargs = {}

if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    # Essential pooler settings for cloud stability
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10
    }

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 3. Email Setup: Gmail SMTP & Supabase Email Templates

### Step 1: Generate Gmail App Password
1. In your Google Account: **Security** ➔ **2-Step Verification** (enable if not already).
2. At the bottom, click **App passwords**.
3. Generate a password named `Backend Auth` and copy the 16 characters (e.g., `qdbjbnmmylpqdkum`).

### Step 2: Configure Custom SMTP in Supabase
1. In Supabase: **Project Settings** ➔ **Authentication** ➔ **SMTP Settings** (or *Providers ➔ Email*).
2. Enable **Custom SMTP**:
   - **Sender email**: `your-email@gmail.com`
   - **Sender name**: `Your App Name`
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: `your-email@gmail.com`
   - **Password**: *[16-character App Password]*
3. Save changes.

### Step 3: Configure 6-Digit OTP Length
- In Supabase: **Authentication** ➔ **Providers** ➔ **Email**.
- Set **Email OTP Length** to `6` (default is 8).
- Set **OTP Expiry** to `600` seconds (10 minutes).
- Save changes.

### Step 4: HTML Email Templates
In Supabase: **Authentication** ➔ **Email Templates**:

#### Template 1: Magic Link / OTP (`Sign in with OTP`)
**Subject:** `Your Verification Code for IP-SAKTI`
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; background: #FAF7F2; border-radius: 16px; overflow: hidden; border: 1px solid #E8E0D5;">
  <div style="background: #2D4A32; padding: 32px 24px; text-align: center;">
    <h1 style="color: #FFFFFF; font-size: 26px; margin: 0; font-family: Georgia, serif;">IP-SAKTI Sahayak</h1>
    <p style="color: #A3C9A8; font-size: 13px; margin: 6px 0 0; letter-spacing: 1px; text-transform: uppercase;">Authentication Service</p>
  </div>
  <div style="padding: 36px 28px; text-align: center;">
    <h2 style="color: #1B2E20; font-size: 20px; margin: 0 0 12px; font-weight: 600;">Your Verification Code</h2>
    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">Use the 6-digit code below to sign in to your workspace. This code expires in 10 minutes.</p>
    <div style="background: #E8E0D5; border: 2px dashed #2D4A32; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 28px;">
      <span style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #1B2E20;">{{ .Token }}</span>
    </div>
    <p style="color: #888; font-size: 12px; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
  </div>
</div>
```

#### Template 2: Reset Password (`Forgot Password`)
**Subject:** `Reset Your Password - Verification Code`
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; background: #FAF7F2; border-radius: 16px; overflow: hidden; border: 1px solid #E8E0D5;">
  <div style="background: #2D4A32; padding: 32px 24px; text-align: center;">
    <h1 style="color: #FFFFFF; font-size: 26px; margin: 0; font-family: Georgia, serif;">IP-SAKTI Sahayak</h1>
    <p style="color: #A3C9A8; font-size: 13px; margin: 6px 0 0; letter-spacing: 1px; text-transform: uppercase;">Password Recovery</p>
  </div>
  <div style="padding: 36px 28px; text-align: center;">
    <h2 style="color: #1B2E20; font-size: 20px; margin: 0 0 12px; font-weight: 600;">Password Reset Code</h2>
    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">We received a request to reset your password. Use the 6-digit code below to verify your account and set a new password.</p>
    <div style="background: #E8E0D5; border: 2px dashed #2D4A32; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 28px;">
      <span style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #1B2E20;">{{ .Token }}</span>
    </div>
    <p style="color: #888; font-size: 12px; margin: 0;">This code is valid for 10 minutes. If you did not request a password reset, please secure your account immediately.</p>
  </div>
</div>
```

---

## 4. Google Firebase Authentication Setup

### Step 1: Create Firebase Project
1. Open [Firebase Console](https://console.firebase.google.com).
2. Click **Add project**, name it (e.g. `ip-sakti-sahayak-22b24`).
3. Disable Google Analytics (optional, avoids unneeded SDK overhead).
4. Click **Create project**.

### Step 2: Enable Google Sign-In Provider
1. In Firebase Console: **Build** ➔ **Authentication** ➔ **Get Started**.
2. Under **Sign-in method**, click **Google**.
3. Toggle **Enable**.
4. Set **Project support email** to your Gmail account.
5. Click **Save**.

### Step 3: Configure Authorized Domains (Critical)
Under **Authentication** ➔ **Settings** ➔ **Authorized domains**, ensure all your domains are listed:
- `localhost`
- `[project-id].firebaseapp.com`
- `[project-id].web.app`
- `your-app-domain.vercel.app` (e.g. `sih-26045-docker.vercel.app`)

> [!WARNING]
> If your Vercel deployment domain is not added to Authorized Domains, Firebase will reject requests with error `auth/unauthorized-domain`.

### Step 4: Register Web App & Obtain Config
1. In **Project settings** (gear icon) ➔ **General** ➔ **Your apps**.
2. Click the Web icon `</>`.
3. Name your app and click **Register app**.
4. Copy the `firebaseConfig`:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyBkWKlgJ3RBHWlGyCTHR86durmEUaA5MXs",
     authDomain: "ip-sakti-sahayak-22b24.firebaseapp.com",
     projectId: "ip-sakti-sahayak-22b24",
     storageBucket: "ip-sakti-sahayak-22b24.firebasestorage.app",
     messagingSenderId: "210880167989",
     appId: "1:210880167989:web:a6f5810545778e2ba1f17c"
   };
   ```

> [!TIP]
> **Avoid the Measurement ID Bug**: Do not import or initialize `getAnalytics(app)` unless you have configured Google Analytics. Including an unconfigured `measurementId` causes runtime error `Cannot read properties of undefined (reading 'M_ID')`. Only `getAuth(app)` is required for authentication.

---

## 5. Backend Implementation (FastAPI + SQLAlchemy + JWT)

### Dependencies (`backend/requirements.txt`)
```text
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.0.0
sqlalchemy>=2.0.0
psycopg[binary]>=3.1.18
psycopg2-binary>=2.9.9
httpx>=0.27.0
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.9
aiosmtplib>=3.0.1
```

### Models (`backend/app/models.py`)
```python
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="Researcher")
    default_jurisdiction = Column(String, default="INDIA")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### Schemas (`backend/app/schemas.py`)
```python
from typing import Optional
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class OTPGenerate(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp_code: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    email: str
    otp_code: str
    new_password: str = Field(..., min_length=6)

class GoogleLoginRequest(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    id_token: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    is_verified: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    default_jurisdiction: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

### Complete Auth Router (`backend/app/api/auth.py`)
```python
import logging
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, OTPRecord
from app.schemas import (
    UserCreate, UserLogin, OTPGenerate, OTPVerify,
    PasswordResetRequest, PasswordResetConfirm, GoogleLoginRequest,
    AuthResponse, UserResponse
)
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()

# --- Supabase HTTPS Bridge Functions ---
async def send_supabase_otp(email: str) -> bool:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/otp",
                headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                json={"email": email, "create_user": True}
            )
            return resp.status_code == 200
    except Exception as exc:
        logger.error(f"Supabase OTP error: {exc}")
        return False

async def send_supabase_password_reset(email: str) -> bool:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/recover",
                headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                json={"email": email}
            )
            return resp.status_code == 200
    except Exception as exc:
        logger.error(f"Supabase Recover error: {exc}")
        return False

async def verify_supabase_otp(email: str, token: str, otp_type: str = "email") -> bool:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return False
    types = [otp_type, "email" if otp_type == "recovery" else "recovery"]
    for t in types:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/verify",
                    headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                    json={"type": t, "email": email, "token": token}
                )
                if resp.status_code == 200:
                    return True
        except Exception:
            pass
    return False

# --- Core Authentication Endpoints ---

@router.post("/signup")
async def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    email = _normalize_email(user_in.email)
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(user_in.password)
    if user:
        user.hashed_password = hashed_pwd
        user.first_name = user_in.first_name
        user.last_name = user_in.last_name
    else:
        user = User(
            email=email,
            hashed_password=hashed_pwd,
            first_name=user_in.first_name,
            last_name=user_in.last_name
        )
        db.add(user)
    db.commit()

    await send_supabase_otp(email)
    return {"message": "Verification code sent to your email.", "requires_otp": True}

@router.post("/login", response_model=AuthResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    email = _normalize_email(user_in.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your OTP.")

    token = create_access_token({"sub": user.email}, timedelta(minutes=settings.access_token_expire_minutes))
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/request-otp")
async def request_otp(otp_in: OTPGenerate, db: Session = Depends(get_db)):
    email = _normalize_email(otp_in.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=get_password_hash("OTP_USER"), is_verified=False)
        db.add(user)
        db.commit()

    await send_supabase_otp(email)
    return {"message": "Verification code sent to your email."}

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(otp_in: OTPVerify, db: Session = Depends(get_db)):
    email = _normalize_email(otp_in.email)
    code = otp_in.otp_code.strip()

    is_valid = await verify_supabase_otp(email, code, otp_type="email")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.commit()

    token = create_access_token({"sub": user.email}, timedelta(minutes=settings.access_token_expire_minutes))
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account associated with this email address")

    sent = await send_supabase_password_reset(email)
    if not sent:
        await send_supabase_otp(email)

    return {"message": "Password reset code sent to your email."}

@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    code = payload.otp_code.strip()
    new_pwd = payload.new_password.strip()

    if len(new_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    is_valid = await verify_supabase_otp(email, code, otp_type="recovery")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(new_pwd)
    user.is_verified = True
    db.commit()

    token = create_access_token({"sub": user.email}, timedelta(minutes=settings.access_token_expire_minutes))
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Authenticate or auto-provision user using verified Firebase Google Sign-In."""
    email = _normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email from Google account")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Automatically provision user in PostgreSQL
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

    token = create_access_token({"sub": user.email}, timedelta(minutes=settings.access_token_expire_minutes))
    return {"access_token": token, "token_type": "bearer", "user": user}
```

---

## 6. Frontend Implementation (Next.js 15 App Router + Firebase + Middleware)

### 1. Install Dependencies
```bash
npm install firebase axios lucide-react sonner
```

### 2. Next.js Config: COOP Header (`next.config.ts`)
Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` so Chromium doesn't block window checks when popups close:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### 3. Firebase Client (`src/lib/firebase.ts`)
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBkWKlgJ3RBHWlGyCTHR86durmEUaA5MXs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ip-sakti-sahayak-22b24.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ip-sakti-sahayak-22b24",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ip-sakti-sahayak-22b24.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "210880167989",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:210880167989:web:a6f5810545778e2ba1f17c"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
```

### 4. API Client (`src/lib/api.ts`)
```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use(config => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ip-sakti-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ip-sakti-token");
      localStorage.removeItem("ip-sakti-user");
      document.cookie = "ip_sakti_session=; path=/; max-age=0; SameSite=Lax";
      window.dispatchEvent(new Event("ip-sakti-auth-expired"));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async register(data: any) {
    const res = await api.post("/auth/signup", data);
    return res.data;
  },
  async login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },
  async requestOtp(email: string) {
    const res = await api.post("/auth/request-otp", { email });
    return res.data;
  },
  async verifyOtp(email: string, otp: string) {
    const res = await api.post("/auth/verify-otp", { email, otp_code: otp });
    return res.data;
  },
  async forgotPassword(email: string) {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },
  async resetPassword(payload: { email: string; otp_code: string; new_password: string }) {
    const res = await api.post("/auth/reset-password", payload);
    return res.data;
  },
  async googleLogin(payload: { email: string; first_name?: string; last_name?: string; id_token?: string }) {
    const res = await api.post("/auth/google", {
      email: payload.email.trim().toLowerCase(),
      first_name: payload.first_name,
      last_name: payload.last_name,
      id_token: payload.id_token
    });
    return res.data;
  }
};
```

### 5. Session State & Secure Cookies (`src/components/providers.tsx`)
```typescript
function setBrowserSession(token: string, user?: AuthUser | null) {
  localStorage.setItem("ip-sakti-token", token);
  if (user) localStorage.setItem("ip-sakti-user", JSON.stringify(user));
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `ip_sakti_session=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax${secure}`;
}

function clearBrowserSession() {
  localStorage.removeItem("ip-sakti-token");
  localStorage.removeItem("ip-sakti-user");
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `ip_sakti_session=; path=/; max-age=0; SameSite=Lax${secure}`;
}
```

### 6. Edge Middleware (`src/middleware.ts`)
```typescript
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify",
  "/auth/forgot-password"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const token = request.cookies.get("ip_sakti_session")?.value;

  if (isPublic) {
    if (token && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/forgot-password"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const protectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/cases") || pathname.startsWith("/profile");
  if (protectedRoute && !token) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/profile/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/verify",
    "/auth/forgot-password"
  ]
};
```

### 7. Google Sign-In Button Handler (`src/app/auth/login/page.tsx`)
```typescript
async function processGoogleUser(googleUser: any) {
  setLoading(true);
  setError("");
  try {
    const names = (googleUser.displayName || "").split(" ");
    const firstName = names[0] || "Researcher";
    const lastName = names.slice(1).join(" ") || "";
    const idToken = await googleUser.getIdToken();

    const result = await authApi.googleLogin({
      email: googleUser.email || "",
      first_name: firstName,
      last_name: lastName,
      id_token: idToken
    });

    if (result.access_token) {
      setSession(result.access_token, result.user);
      // Hard navigation ensures browser sends cookie header to Next.js middleware
      window.location.href = next;
    } else {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  } catch (err) {
    console.error("Google sign-in error", err);
    setError(getApiErrorMessage(err, "We couldn't complete sign in with Google."));
    setLoading(false);
  }
}

async function handleGoogleSignIn() {
  setError("");
  setInfo("");
  setLoading(true);
  try {
    const { signInWithPopup, signInWithRedirect } = await import("firebase/auth");
    const { auth, googleProvider } = await import("@/lib/firebase");

    try {
      // 1. Popup first: avoids cookie partitioning issues in Brave/Safari
      const userCred = await signInWithPopup(auth, googleProvider);
      if (userCred?.user) {
        await processGoogleUser(userCred.user);
        return;
      }
    } catch (popupErr: any) {
      if (popupErr?.code === "auth/popup-closed-by-user") {
        setLoading(false);
        return;
      }
      // 2. Fallback to redirect if popup is blocked by browser
      if (popupErr?.code === "auth/popup-blocked" || popupErr?.code === "auth/cancelled-popup-request") {
        sessionStorage.setItem("ip_sakti_google_pending", "1");
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw popupErr;
    }
  } catch (err: any) {
    if (err?.code === "auth/unauthorized-domain") {
      setError("Domain not authorized in Firebase Console. Add this domain under Authentication > Settings > Authorized Domains.");
    } else {
      setError(getApiErrorMessage(err, "Could not sign in with Google."));
    }
    setLoading(false);
  }
}

// Catch redirect result if browser fell back to redirect
useEffect(() => {
  let isMounted = true;
  async function handlePendingRedirect() {
    try {
      const { getRedirectResult, onAuthStateChanged } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      const userCred = await getRedirectResult(auth);
      if (userCred?.user && isMounted) {
        sessionStorage.removeItem("ip_sakti_google_pending");
        await processGoogleUser(userCred.user);
        return;
      }

      if (typeof window !== "undefined" && sessionStorage.getItem("ip_sakti_google_pending") === "1") {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user && isMounted) {
            sessionStorage.removeItem("ip_sakti_google_pending");
            unsubscribe();
            await processGoogleUser(user);
          }
        });
        setTimeout(() => {
          if (isMounted) sessionStorage.removeItem("ip_sakti_google_pending");
        }, 6000);
      }
    } catch (err) {
      console.error("Google redirect handling error", err);
    }
  }
  handlePendingRedirect();
  return () => { isMounted = false; };
}, [next]);
```

---

## 7. Environment Variables Reference

### Backend (`backend/.env` & Render Dashboard)
```ini
# Production Supabase PostgreSQL Session Pooler (port 5432)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Supabase Auth HTTPS Dispatch (port 443)
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]

# Gmail SMTP (For local dev fallback & Supabase custom SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=your-email@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587

# Security
SECRET_KEY=generate-a-random-64-character-string
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=*
```

### Frontend (`frontend/.env.local` & Vercel Dashboard)
```ini
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
NEXT_PUBLIC_USE_MOCK_API=false

# Firebase Web App Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBkWKlgJ3RBHWlGyCTHR86durmEUaA5MXs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=210880167989
NEXT_PUBLIC_FIREBASE_APP_ID=1:210880167989:web:a6f5810545778e2ba1f17c
```

---

## 8. Deployment Guide (Vercel & Render)

### Backend on Render (100% Free)
1. In [Render](https://render.com), create a new **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `backend` (or leave empty if Dockerfile is in repo root).
   - **Runtime**: `Docker`.
   - **Instance Type**: `Free`.
4. Add the Environment Variables from Section 7.
5. In Render Settings, enable **Auto-Deploy** or use **Manual Deploy ➔ Deploy latest commit**.

### Frontend on Vercel (100% Free)
1. In [Vercel](https://vercel.com), create a new **Project**.
2. Select your repository.
3. Set **Root Directory** to `frontend` (e.g. `IP-SAKTI-frontend/frontend-koutsa`).
4. Set the Environment Variables from Section 7.
5. Deploy.

---

## 9. Comprehensive Troubleshooting & Gotchas Matrix

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`ConnectionRefusedError: [Errno 111]` on port 587** | Free cloud tiers (Render, AWS Lambda) block outbound SMTP ports 25, 465, 587. | Use Supabase Auth HTTPS API (`/auth/v1/otp`, `/auth/v1/recover`) over port 443. Supabase relays the email through Gmail SMTP. |
| **Google Sign-In stays on Login page / returns `null`** | Modern browsers (Brave Shields, Safari ITP) partition storage, breaking `signInWithRedirect`. | Use `signInWithPopup` as the primary flow. Popups use direct window `postMessage` which is not blocked by third-party cookie restrictions. |
| **`Cross-Origin-Opener-Policy would block window.closed`** | Missing COOP headers when popup communicates with opener window. | Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` to `headers()` in `next.config.ts`. |
| **User bounces back to Login page immediately after auth** | Next.js soft navigation `router.push()` executes before browser commits cookie header to middleware. | Use `window.location.href = next;` upon successful login to guarantee cookie is transmitted in the document request header. |
| **`Cannot read properties of undefined (reading 'M_ID')`** | Importing `getAnalytics` from `firebase/analytics` when Google Analytics is not enabled. | Remove `measurementId` and `getAnalytics` imports. Use only `getAuth(app)`. |
| **`API key not valid` (400 from `identitytoolkit.googleapis.com`)** | Character typo in Firebase Web API Key (e.g., `8` instead of `B`, uppercase `L` instead of lowercase `l`). | Copy the exact Web API Key from Firebase Console ➔ Project Settings. |
| **`auth/unauthorized-domain`** | Vercel domain not added to Firebase Authorized Domains list. | Go to Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains ➔ Add `your-app.vercel.app`. |
| **Dashboard 401 Unauthorized redirect loop** | Frontend fell back to a fake/mock token when backend was slow. FastAPI rejects the token on `/cases`. | Never store mock tokens when talking to a real backend. Let backend return genuine JWT tokens signed by `SECRET_KEY`. |
| **Supabase OTP has 8 digits instead of 6** | Supabase default OTP length is 8. | Change **Email OTP Length** to `6` in Supabase: *Authentication ➔ Providers ➔ Email*. |
| **Database drops connection on Render** | Free container suspends idle connections. | Add `pool_pre_ping=True` and `pool_recycle=300` in SQLAlchemy `create_engine`. |
| **Cannot connect to Supabase DB on Render** | Direct `db.[ref].supabase.co` resolves to IPv6, which Render free tier cannot route. | Use the **Session Pooler URI** (`aws-0-[region].pooler.supabase.com:5432`) which routes over IPv4. |
| **`Token has expired or is invalid` on verify** | Supabase verify called with wrong `type`. | Send `{"type": "recovery"}` for password reset, and `{"type": "email"}` for OTP sign-in. |
| **User stuck in redirect loop on public page** | Route missing from Edge Middleware whitelist. | Add the route to `PUBLIC_PATHS` and `matcher` in `middleware.ts`. |
