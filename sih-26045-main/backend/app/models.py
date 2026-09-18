from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

from .db import Base

class FormulationSubmission(Base):
    __tablename__ = "formulation_submissions"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    as_of_date = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    ingredients = Column(Text, nullable=True)
    disease = Column(String, nullable=True)
    preparation_method = Column(Text, nullable=True)
    dosage = Column(String, nullable=True)
    route = Column(String, nullable=True)
    tool = Column(String, nullable=True)
    tool_input = Column(Text, nullable=True)
    
    # Status tracking: PENDING -> PROCESSING -> SCORED -> EXPLAINED -> DONE / FAILED
    status = Column(String, default="PENDING")
    
    # Storing final result or intermediate data
    result_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ExtractedFact(Base):
    __tablename__ = "extracted_facts"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(String, index=True) # Will be joined with FormulationSubmission.submission_id
    field = Column(String, nullable=False)
    value = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    status = Column(String, default="PENDING")
    confidence = Column(Float, default=0.0)
    source_span = Column(Text, nullable=True)



class TKDLRecord(Base):
    """
    Skeleton for friend's structured TKDL dataset.
    Expand this schema based on the actual tables provided.
    """
    __tablename__ = "tkdl_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    disease = Column(String, nullable=True)
    ingredients = Column(Text, nullable=True)
    tkrc_code = Column(String, nullable=True)
    ipc_code = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    default_jurisdiction = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
