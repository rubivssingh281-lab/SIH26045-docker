from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User, OTPRecord
from app.schemas import UserCreate, UserResponse, OTPVerify, OTPGenerate, Token, AuthResponse, UserLogin, UserUpdate
from app.utils.security import get_password_hash, verify_password, create_access_token, generate_otp
from app.utils.email import send_otp_email
from app.config import settings
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
async def signup(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email, 
        hashed_password=hashed_pwd,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role="Researcher",
        default_jurisdiction="INDIA"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OTP
    otp_record = OTPRecord(email=new_user.email, otp_code=otp, expires_at=expires)
    db.add(otp_record)
    db.commit()

    # Send the verification code by email.
    background_tasks.add_task(send_otp_email, email=new_user.email, otp=otp)
    return new_user


@router.post("/login", response_model=AuthResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
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
    user = db.query(User).filter(User.email == otp_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account associated with this email")
        
    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OTP
    otp_record = OTPRecord(email=user.email, otp_code=otp, expires_at=expires)
    db.add(otp_record)
    db.commit()

    # Send the verification code by email.
    background_tasks.add_task(send_otp_email, email=user.email, otp=otp)
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(otp_in: OTPVerify, db: Session = Depends(get_db)):
    otp_record = db.query(OTPRecord).filter(
        OTPRecord.email == otp_in.email,
        OTPRecord.otp_code == otp_in.otp_code
    ).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    now = datetime.now(timezone.utc)
    if otp_record.expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
        
    if now > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
        
    user = db.query(User).filter(User.email == otp_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Mark user as verified if they weren't already
    if not user.is_verified:
        user.is_verified = True
        
    db.delete(otp_record)
    db.commit()
    
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


