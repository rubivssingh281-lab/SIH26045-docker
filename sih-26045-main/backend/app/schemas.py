from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    app: str
    dependencies: Dict[str, str] = Field(default_factory=dict)

# Auth Schemas
class UserCreate(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class OTPGenerate(BaseModel):
    email: str = Field(..., description="User's email address")

class OTPVerify(BaseModel):
    email: str = Field(..., description="User's email address")
    otp_code: str = Field(..., description="The 6-digit OTP code received via email")

class UserLogin(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")

class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="User's email address")

class PasswordResetConfirm(BaseModel):
    email: str = Field(..., description="User's email address")
    otp_code: str = Field(..., description="The 6-digit OTP code received via email")
    new_password: str = Field(..., description="The new password (at least 6 characters)")

class GoogleLoginRequest(BaseModel):
    email: str = Field(..., description="Google account email")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    id_token: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    is_verified: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    default_jurisdiction: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    default_jurisdiction: Optional[str] = None

# Case / Formulation Submission Schemas
class CreateCasePayload(BaseModel):
    title: str = Field(..., description="Title of the formulation/case")
    description: str = Field(..., description="Description of the case")
    as_of_date: str = Field(..., description="Relevant date for the case")
    jurisdiction: str = Field(..., description="Jurisdiction involved")
    tool: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None

class CaseResponse(BaseModel):
    id: str = Field(..., description="Case ID (submission_id)")
    title: str
    description: str
    as_of_date: str
    jurisdiction: str
    status: str
    classification: Optional[str] = None
    confidence: Optional[Dict[str, Any]] = None
    version: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    tool: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None
    analysis: Optional[Dict[str, Any]] = None

class FormulationSubmitRequest(BaseModel):
    title: str = Field(..., description="Title of the formulation")
    ingredients: str = Field(..., description="Comma separated list of ingredients")
    disease: str = Field(..., description="Target disease or purpose")
    preparation_method: Optional[str] = Field(None, description="How to prepare the formulation")
    dosage: Optional[str] = Field(None, description="Recommended dosage")
    route: Optional[str] = Field(None, description="Route of administration")

class FormulationSubmissionResponse(BaseModel):
    submission_id: str
    status: str
    message: str

class FormulationDetailResponse(BaseModel):
    submission_id: str
    title: str
    status: str
    result: Optional[Dict[str, Any]] = None

class ExtractedFactSchema(BaseModel):
    id: Optional[int] = None
    submission_id: str
    field: str
    value: Optional[str] = None
    normalized_value: Optional[str] = None
    status: str = "PENDING"
    confidence: float = 0.0
    source_span: Optional[str] = None

    class Config:
        from_attributes = True

class FactInput(BaseModel):
    id: Optional[str] = None
    field: str
    value: Any
    normalized_value: Optional[str] = None
    status: str = "CONFIRMED"
    confidence: float = Field(default=0.0, ge=0, le=1)
    source_span: Optional[str] = None
    user_editable: bool = True

class FactsPayload(BaseModel):
    facts: List[FactInput] = Field(min_length=1)

class AnalyzePayload(BaseModel):
    jurisdiction: str = Field(min_length=1)
    as_of_date: str = Field(min_length=4)
    tool: Optional[str] = None

class EscalatePayload(BaseModel):
    reason: str = Field(min_length=3, max_length=2000)


class AskCitation(BaseModel):
    title: Optional[str] = None
    citation: Optional[str] = None
    excerpt: Optional[str] = None
    source_url: Optional[str] = None

class AskResultPayload(BaseModel):
    answer: str
    citations: List[AskCitation] = Field(default_factory=list)


class ArchiveExportRow(BaseModel):
    title: Optional[str] = None
    tool: Optional[str] = None
    jurisdiction: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    updated_at: Optional[str] = None

class ArchiveExportPayload(BaseModel):
    rows: List[ArchiveExportRow] = Field(default_factory=list)


# TKDL Search Schemas
class TKDLSearchRequest(BaseModel):
    query: Optional[str] = None
    ingredient: Optional[str] = None
    disease: Optional[str] = None
    tkrc_code: Optional[str] = None

class TKDLRecordResponse(BaseModel):
    record_id: str
    title: str
    disease: Optional[str] = None
    ingredients: Optional[str] = None
    tkrc_code: Optional[str] = None
    ipc_code: Optional[str] = None

class TKDLSearchResponse(BaseModel):
    results: List[TKDLRecordResponse]
    total_count: int

# Integration Contracts (ML & RAG)
class MLInputSchema(BaseModel):
    submission_id: str
    title: str
    ingredients: str
    disease: str
    preparation_method: Optional[str]
    dosage: Optional[str]
    route: Optional[str]

class MLOutputSchema(BaseModel):
    risk_category: str
    confidence: float
    similarity_scores: Dict[str, float]
    matched_records: List[str]
    feature_breakdown: Dict[str, Any]

class RAGInputSchema(BaseModel):
    formulation: FormulationSubmitRequest
    matched_records: List[Dict[str, Any]]
    similarity_scores: Dict[str, float]

class RAGOutputSchema(BaseModel):
    explanation_text: str
    citations: List[str]
    confidence_note: str
    insufficient_evidence: bool = False

class ErrorResponse(BaseModel):
    detail: str
