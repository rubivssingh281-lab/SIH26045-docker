# Complete Guide: Universal Full-Stack Authentication System
### (Next.js 15 App Router + FastAPI + Supabase PostgreSQL + Custom Gmail SMTP + Forgot Password Flow)

This comprehensive guide explains how to replicate the entire enterprise-grade authentication system from this project into any new repository or project.

---

## Table of Contents
1. [Architecture Overview & Cloud Port 587 Bypass](#1-architecture-overview--cloud-port-587-bypass)
2. [Database Setup: Supabase PostgreSQL Persistence](#2-database-setup-supabase-postgresql-persistence)
3. [Email Setup: Gmail SMTP & Supabase Email Templates](#3-email-setup-gmail-smtp--supabase-email-templates)
4. [Backend Implementation (FastAPI + SQLAlchemy)](#4-backend-implementation-fastapi--sqlalchemy)
5. [Frontend Implementation (Next.js 15 App Router)](#5-frontend-implementation-nextjs-15-app-router)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Deployment Guide (Vercel & Render)](#7-deployment-guide-vercel--render)
8. [Troubleshooting & Gotchas](#8-troubleshooting--gotchas)

---

## 1. Architecture Overview & Cloud Port 587 Bypass

### The Architecture
```
┌─────────────────────────────────┐
│     Next.js 15 App Router       │  (Vercel)
│  - Password Login / OTP Login   │
│  - 2-Stage Forgot Password      │
│  - JWT Bearer Token Session     │
└──────────────┬──────────────────┘
               │ HTTPS (Port 443)
               ▼
┌─────────────────────────────────┐
│        FastAPI Backend          │  (Render / Docker)
│  - Passwords: Bcrypt Hashing    │
│  - Tokens: JWT Access Tokens    │
│  - Fallback: Local DB OTP Table │
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

### The Crucial Discovery: Why Direct SMTP Fails on Cloud Hosts
Free cloud tiers (Render, AWS Lambda, Vercel Serverless, DigitalOcean App Platform) **block outbound ports 25, 465, and 587** to prevent email spam. Calling `aiosmtplib` directly from Python on port 587 hangs or raises `ConnectionRefusedError: [Errno 111]`.

**The Solution:**
The FastAPI backend calls the Supabase Auth API (`/auth/v1/otp` and `/auth/v1/recover`) over **HTTPS (Port 443)**, which is never blocked. Supabase's cloud infrastructure then relays the email through your Gmail account using Custom SMTP. If running locally, the backend can also send directly via SMTP as a fallback.

---

## 2. Database Setup: Supabase PostgreSQL Persistence

Free cloud instances have ephemeral local disk (SQLite wipes on every reboot or redeploy). Supabase gives you a permanent, free 500MB PostgreSQL database.

### Step 1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. Note your **Project Reference** (e.g., `khywjiwqnqmoayuzhnxz`) and your **Database Password**.

### Step 2: Get IPv4 Connection String (Connection Pooler)
Render and many cloud providers run on IPv4. Direct connection to `db.[ref].supabase.co` uses IPv6 and fails on Render.
1. In Supabase, go to **Project Settings** ➔ **Database**.
2. Under **Connection String**, select the **URI** tab.
3. Switch Mode to **Session** (Port `5432`).
4. Copy the URI:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

### Step 3: Backend Database Driver Configuration (`db.py`)
In SQLAlchemy 2.0, standard `postgresql://` can fail without a specific driver dialect. Use `postgresql+psycopg2://` with connection pooling:

```python
# backend/app/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Auto-convert postgresql:// to postgresql+psycopg2://
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {}
engine_kwargs = {}

if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    # Supabase connection pooler settings
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

### Step 1: Generate a Gmail App Password
1. In your Google Account: **Security** ➔ **2-Step Verification** (must be enabled).
2. Scroll to the bottom and click **App passwords**.
3. Create an app named `Backend Auth`, and copy the 16-character password (e.g. `qdbjbnmmylpqdkum`).

### Step 2: Configure Custom SMTP in Supabase
1. In Supabase Dashboard: **Project Settings** ➔ **Authentication** ➔ **SMTP Settings** (or *Providers ➔ Email*).
2. Toggle **Enable Custom SMTP**:
   - **Sender email**: `your-email@gmail.com`
   - **Sender name**: `Your App Name`
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: `your-email@gmail.com`
   - **Password**: *[Your 16-character Gmail App Password]*
3. Click **Save**.

### Step 3: Change OTP Length to 6 Digits
By default, Supabase sends 8-digit OTPs. Change it to 6:
- Go to **Authentication** ➔ **Providers** ➔ **Email**.
- Under **Email OTP Length**, change `8` to `6`.
- Set **OTP Expiry** to `600` (10 minutes).
- Click **Save**.

### Step 4: Configure Branded HTML Email Templates
In Supabase: **Authentication** ➔ **Email Templates**:

#### Template 1: Magic Link / OTP (`Sign in with OTP`)
**Subject:** `Your Verification Code for Your App`
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

## 4. Backend Implementation (FastAPI + SQLAlchemy)

### Required Dependencies (`requirements.txt`)
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
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, OTPRecord
from app.schemas import (
    UserCreate, UserLogin, OTPGenerate, OTPVerify,
    PasswordResetRequest, PasswordResetConfirm, AuthResponse, UserResponse
)
from app.utils.security import get_password_hash, verify_password, create_access_token, generate_otp
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
    # Try preferred type first (recovery or email), fallback to the other
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

# --- Core Endpoints ---

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

    # Dispatch OTP via Supabase HTTPS
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

    token = create_access_token({"sub": user.email}, timedelta(minutes=480))
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/request-otp")
async def request_otp(otp_in: OTPGenerate, db: Session = Depends(get_db)):
    email = _normalize_email(otp_in.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Auto-provision unverified user for seamless OTP login
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

    token = create_access_token({"sub": user.email}, timedelta(minutes=480))
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account associated with this email address")

    sent = await send_supabase_password_reset(email)
    if not sent:
        # Fallback to OTP dispatch if recover fails
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

    token = create_access_token({"sub": user.email}, timedelta(minutes=480))
    return {"access_token": token, "token_type": "bearer", "user": user}
```

---

## 5. Frontend Implementation (Next.js 15 App Router)

### 1. API Client (`src/lib/api.ts`)
```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use(config => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  }
};
```

### 2. Middleware Whitelisting (`src/middleware.ts`)
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
  const token = request.cookies.get("session_token")?.value;

  if (isPublic) {
    if (token && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/forgot-password"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token && (pathname.startsWith("/dashboard") || pathname.startsWith("/profile"))) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/verify",
    "/auth/forgot-password"
  ]
};
```

### 3. Forgot Password Page (`src/app/auth/forgot-password/page.tsx`)
Create a 2-stage verification flow:
- **Stage 1**: Email input field ➔ triggers `authApi.forgotPassword(email)`.
- **Stage 2**:
  - Masked email badge.
  - 6-digit OTP code input with numeric inputmode and 60-second countdown timer.
  - New Password & Confirm Password inputs with eye/eye-off toggle.
  - Submits to `authApi.resetPassword(...)`.
  - Sets auth token and redirects to `/dashboard`.

---

## 6. Environment Variables Reference

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
```

---

## 7. Deployment Guide (Vercel & Render)

### Backend on Render (100% Free)
1. In [Render](https://render.com), create a new **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `backend` (or leave blank if Dockerfile is at repo root).
   - **Runtime**: `Docker`.
   - **Instance Type**: `Free`.
4. Add the Environment Variables from Section 6.
5. In Render Settings, enable **Auto-Deploy** or use **Manual Deploy ➔ Deploy latest commit**.

### Frontend on Vercel (100% Free)
1. In [Vercel](https://vercel.com), create a new **Project**.
2. Select your repository.
3. Set **Root Directory** to `frontend` (e.g. `IP-SAKTI-frontend/frontend-koutsa`).
4. Set `NEXT_PUBLIC_API_BASE_URL` to your Render backend URL (no trailing slash).
5. Deploy.

---

## 8. Troubleshooting & Gotchas

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `ConnectionRefusedError: [Errno 111]` on port 587 | Render free tier blocks outbound SMTP ports. | Use Supabase Auth HTTPS API (`/auth/v1/otp`, `/auth/v1/recover`) over port 443. |
| Supabase OTP has 8 digits instead of 6 | Supabase defaults to 8-digit OTPs. | Change **Email OTP Length** to `6` in Supabase: *Authentication ➔ Providers ➔ Email*. |
| Database connection drops on Render | Free container shuts down idle connections. | Set `pool_pre_ping=True` and `pool_recycle=300` in SQLAlchemy `create_engine`. |
| Cannot connect to Supabase DB on Render | Direct `db.xxx.supabase.co` uses IPv6, which Render free tier cannot route. | Use the **Connection Pooler URI** (`aws-0-xxx.pooler.supabase.com:5432`) which supports IPv4. |
| Verification fails with `Token has expired or is invalid` | Supabase verify called with wrong `type`. | For password reset, send `{"type": "recovery"}`. For OTP sign-in, send `{"type": "email"}`. |
| User stuck in redirect loop | Middleware redirects protected pages before checking token. | Add the route to `PUBLIC_PATHS` and `matcher` in `middleware.ts`. |
