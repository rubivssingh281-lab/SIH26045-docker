# IP-SAKTI Sahayak — Complete Project Architecture

**Project Name:** IP-SAKTI Sahayak (Intellectual Property - Support and Knowledge Intelligence)  
**Type:** Full-stack AI-powered legal decision support system  
**Tech Stack:** Next.js (Frontend) + FastAPI (Backend) + Python ML Pipeline + ChromaDB (RAG)  
**Status:** 7-day prototype implementation

---

## Table of Contents

1. [High-Level System Architecture](#high-level-system-architecture)
2. [Project Directory Structure](#project-directory-structure)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [ML Pipeline & Data Processing](#ml-pipeline--data-processing)
6. [Data Flow & Integration](#data-flow--integration)
7. [Database Schema](#database-schema)
8. [API Contracts](#api-contracts)

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (Next.js + React + Tailwind)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP / REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       FASTAPI BACKEND                           │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │  Auth Layer  │  │ API Routes  │  │  Middleware/Logging    │  │
│  │  (JWT/OAuth) │  │  (REST)     │  │  (CORS, Rate Limiting) │  │
│  └──────────────┘  └─────────────┘  └────────────────────────┘  │
│                             │                                     │
│         ┌───────────────────┼───────────────────┐                │
│         │                   │                   │                │
│  ┌──────▼──────────┐ ┌─────▼──────┐ ┌──────────▼──────────┐     │
│  │  CORE PIPELINE  │ │   MODELS   │ │   DATABASE LAYER   │     │
│  │  (Fact Extraction,│ │  (SQLModel)│ │   (SQLAlchemy)     │     │
│  │   Normalization,  │ │            │ │   (SQLite)         │     │
│  │   Rule Engine,    │ │  FormulationSub │                │     │
│  │   Confidence,     │ │  ExtractedFact  │  query/create   │     │
│  │   Explain)        │ │  TKDLRecord    │  case records    │     │
│  └──────┬───────────┘ └─────────────┘ └────────────────────┘     │
│         │                                                        │
│  ┌──────▼────────────┬─────────────────┬──────────────────────┐ │
│  │  LLM / AI Layer   │  Rule Engine    │   RAG Integration   │ │
│  │  ┌────────────┐   │  ┌──────────┐   │  ┌──────────────┐  │ │
│  │  │OpenAI API  │   │  │rules.json│   │  │  ChromaDB    │  │ │
│  │  │(GPT-4)     │   │  │(decision │   │  │ (Embeddings) │  │ │
│  │  │            │   │  │ logic)   │   │  │              │  │ │
│  │  └────────────┘   │  └──────────┘   │  └──────────────┘  │ │
│  │                   │                   │                    │ │
│  └───────────────────┴─────────────────┴────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼────────┐
    │  SQLite  │      │  ChromaDB  │     │ External APIs│
    │   DB     │      │ (Vectors)  │     │ (OpenAI)     │
    └──────────┘      └────────────┘     └──────────────┘

ML PIPELINE (Offline / Batch Processing)
    ↓
┌────────────────────────────────────────────────────────────────┐
│              Jupyter Notebooks (Experimentation)               │
│  Data Loading → NLP → Entity Extraction → Normalization →      │
│  Embedding Generation → XGBoost Training → Risk Scoring →      │
│  RAG Retrieval & Generation → End-to-End Pipeline Testing      │
└────────────────────────────────────────────────────────────────┘
    ↓
    Models & Vectorstore (imported into backend)
```

---

## Project Directory Structure

```
sih-26045-main/
│
├── 📄 Technical_Architecture.md           # Tech stack and routing overview
├── 📄 IP-SAKTI-Sahayak-final-spec-v4.md   # Complete product specification
├── 📄 Frontend_Plan.md                    # Frontend implementation guide
├── 📄 Frontend_Work_Division.md           # Team division and responsibilities
├── 📄 e2e_test.py                         # End-to-end test suite
│
├── 📁 backend/                            # ✅ FASTAPI APPLICATION
│   ├── requirements.txt                   # Python dependencies
│   ├── app.db                             # SQLite database (dev)
│   ├── .venv/                             # Virtual environment
│   ├── .pytest_cache/                     # Test artifacts
│   │
│   ├── 📁 app/                            # Main application code
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app creation, CORS, router setup
│   │   ├── config.py                      # App configuration & settings
│   │   ├── db.py                          # SQLAlchemy engine & session management
│   │   ├── deps.py                        # Dependency injection (current_user, db_session)
│   │   ├── models.py                      # SQLAlchemy ORM models
│   │   ├── schemas.py                     # Pydantic request/response schemas
│   │   │
│   │   ├── 📁 api/                        # API endpoints (REST routes)
│   │   │   ├── __init__.py
│   │   │   ├── health.py                  # GET / -> health check
│   │   │   ├── auth.py                    # Authentication endpoints
│   │   │   │                              #   POST /auth/register
│   │   │   │                              #   POST /auth/login
│   │   │   │                              #   GET /auth/me
│   │   │   ├── cases.py                   # Case management endpoints
│   │   │   │                              #   GET /cases
│   │   │   │                              #   POST /cases
│   │   │   │                              #   GET /cases/{id}
│   │   │   │                              #   POST /cases/{id}/facts
│   │   │   │                              #   PUT /cases/{id}/facts
│   │   │   │                              #   POST /cases/{id}/analyze
│   │   │   │                              #   GET /cases/{id}/explain
│   │   │   │                              #   GET /cases/{id}/report
│   │   │   │                              #   GET /cases/{id}/history
│   │   │   └── assistant.py               # AI assistant endpoints (helpers)
│   │   │
│   │   ├── 📁 llm/                        # LLM & AI Integration
│   │   │   ├── __init__.py
│   │   │   ├── client.py                  # OpenAI client wrapper
│   │   │   │                              # - create_embedding()
│   │   │   │                              # - extract_facts()
│   │   │   │                              # - validate_extraction()
│   │   │   ├── prompts.py                 # Prompt templates for LLM
│   │   │   │                              # - FACT_EXTRACTION_PROMPT
│   │   │   │                              # - VALIDATION_PROMPT
│   │   │   │                              # - EVIDENCE_SYNTHESIS_PROMPT
│   │   │   └── validators.py              # LLM output validation
│   │   │                                  # - validate_fact_structure()
│   │   │                                  # - validate_confidence_format()
│   │   │
│   │   ├── 📁 pipeline/                   # Core Analysis Pipeline
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py            # Pipeline coordinator
│   │   │   │                              # - run_full_pipeline()
│   │   │   │                              # - run_extraction_stage()
│   │   │   │                              # - run_analysis_stage()
│   │   │   ├── fact_extraction.py         # LLM-based fact extraction
│   │   │   │                              # - extract_facts_from_description()
│   │   │   │                              # - parse_structured_facts()
│   │   │   ├── normalization.py           # Ingredient/formulation normalization
│   │   │   │                              # - normalize_ingredient()
│   │   │   │                              # - load_alias_dictionary()
│   │   │   ├── rule_engine.py             # Deterministic rule engine
│   │   │   │                              # - load_rules()
│   │   │   │                              # - evaluate_facts_against_rules()
│   │   │   │                              # - get_fired_rules()
│   │   │   ├── retrieval.py               # Evidence retrieval from RAG
│   │   │   │                              # - retrieve_evidence()
│   │   │   │                              # - rank_by_relevance()
│   │   │   ├── citation_validation.py     # Validate retrieved evidence
│   │   │   │                              # - validate_citation()
│   │   │   │                              # - check_evidence_relevance()
│   │   │   ├── confidence.py              # Multi-dimensional confidence scoring
│   │   │   │                              # - calculate_fact_confidence()
│   │   │   │                              # - calculate_rule_fit_confidence()
│   │   │   │                              # - calculate_evidence_confidence()
│   │   │   │                              # - calculate_citation_confidence()
│   │   │   │                              # - calculate_overall_confidence()
│   │   │   │                              # - determine_confidence_band()
│   │   │   └── explain.py                 # Explainability trace generation
│   │   │                                  # - generate_explanation()
│   │   │                                  # - build_stepper_trace()
│   │   │
│   │   ├── 📁 rag/                        # Retrieval-Augmented Generation
│   │   │   ├── __init__.py
│   │   │   ├── vector_store.py            # ChromaDB vector store interface
│   │   │   │                              # - init_vector_store()
│   │   │   │                              # - search_vectors()
│   │   │   │                              # - add_documents()
│   │   │   ├── embeddings.py              # Embedding generation
│   │   │   │                              # - create_embeddings()
│   │   │   │                              # - embed_query()
│   │   │   ├── ingestion.py               # Corpus ingestion pipeline
│   │   │   │                              # - ingest_corpus()
│   │   │   │                              # - parse_statutes()
│   │   │   ├── keyword_boost.py           # Keyword weighting for retrieval
│   │   │   │                              # - boost_keyword_relevance()
│   │   │   │                              # - apply_jurisdiction_filter()
│   │   │   └── prior_art.py               # Prior art & TKDL handling
│   │   │                                  # - flag_tkdl_relevance()
│   │   │                                  # - retrieve_prior_art()
│   │   │
│   │   ├── 📁 rules/                      # Rule Engine Assets
│   │   │   ├── __init__.py
│   │   │   ├── loader.py                  # Rule loader and parser
│   │   │   │                              # - load_rules_from_json()
│   │   │   │                              # - validate_rule_structure()
│   │   │   └── rules.json                 # Rule definitions (JSON)
│   │   │                                  # Format:
│   │   │                                  # [
│   │   │                                  #   {
│   │   │                                  #     "id": "R-3P-02",
│   │   │                                  #     "name": "Classical Formula",
│   │   │                                  #     "conditions": [...],
│   │   │                                  #     "conclusion": "classical",
│   │   │                                  #     "citations": [...]
│   │   │                                  #   }
│   │   │                                  # ]
│   │   │
│   │   ├── 📁 data/                       # Static data assets
│   │   │   └── alias_dict.json            # Ingredient name normalization
│   │   │                                  # {
│   │   │                                  #   "Ashwagandha": ["ashwagandha", "withania somnifera", ...],
│   │   │                                  #   "Tulsi": ["tulsi", "ocimum sanctum", ...],
│   │   │                                  #   ...
│   │   │                                  # }
│   │   │
│   │   ├── 📁 utils/                      # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── errors.py                  # Custom exception classes
│   │   │   ├── security.py                # JWT/auth utilities
│   │   │   ├── email.py                   # Email sending (escalation)
│   │   │   └── logging.py                 # Logging configuration
│   │   │
│   │   └── 📁 __pycache__/
│   │
│   ├── 📁 chroma_db/                      # ChromaDB persistent storage
│   │   ├── chroma.sqlite3                 # Vector store database
│   │   └── [collection_folders]/          # ChromaDB collection data
│   │
│   ├── 📁 scripts/                        # Utility scripts
│   │   ├── seed_db.py                     # Initialize database with sample data
│   │   ├── ingest_corpus.py               # Ingest legal corpus into ChromaDB
│   │   └── evaluate_retrieval.py          # Evaluate retrieval quality
│   │
│   ├── 📁 tests/                          # Test suite
│   │   ├── 📁 unit/                       # Unit tests
│   │   ├── 📁 integration/                # Integration tests
│   │   └── 📁 e2e/                        # End-to-end tests
│   │
│   ├── test_endpoints.py                  # Quick endpoint testing
│   └── verify_pipeline.py                 # Pipeline verification script
│
├── 📁 IP-SAKTI-frontend/                  # ✅ NEXT.JS APPLICATION
│   └── 📁 frontend-koutsa/                # Main Next.js project
│       ├── package.json                   # NPM dependencies
│       ├── pnpm-lock.yaml                 # Dependency lock file
│       ├── pnpm-workspace.yaml            # Monorepo config (if applicable)
│       ├── tsconfig.json                  # TypeScript configuration
│       ├── next.config.ts                 # Next.js configuration
│       ├── tailwind.config.ts             # Tailwind CSS configuration
│       ├── postcss.config.js              # PostCSS configuration
│       ├── eslint.config.mjs              # ESLint configuration
│       ├── next-env.d.ts                  # Next.js TypeScript definitions
│       ├── README.md                      # Frontend documentation
│       │
│       └── 📁 src/                        # Source code
│           ├── middleware.ts              # Next.js middleware (auth guards)
│           │
│           ├── 📁 app/                    # Next.js App Router (Pages & Layouts)
│           │   ├── layout.tsx             # Root layout component
│           │   ├── page.tsx               # Home page (redirect to dashboard)
│           │   ├── globals.css            # Global styles
│           │   ├── error.tsx              # Global error boundary
│           │   ├── not-found.tsx          # 404 page
│           │   │
│           │   ├── 📁 auth/               # Authentication pages
│           │   │   ├── login/
│           │   │   │   └── page.tsx       # Login form
│           │   │   ├── register/
│           │   │   │   └── page.tsx       # Registration form
│           │   │   └── logout/
│           │   │       └── page.tsx       # Logout handler
│           │   │
│           │   ├── 📁 dashboard/          # Screen 1: Dashboard
│           │   │   ├── layout.tsx         # Dashboard layout (sidebar nav)
│           │   │   └── page.tsx           # Case list + Create New button
│           │   │
│           │   ├── 📁 cases/              # Case management
│           │   │   ├── 📁 new/            # Screen 2: Create Case
│           │   │   │   └── page.tsx       # Form: description, as_of_date, jurisdiction
│           │   │   │
│           │   │   ├── 📁 [id]/           # Dynamic case detail pages
│           │   │   │   ├── layout.tsx     # Case detail layout
│           │   │   │   ├── page.tsx       # Screen 4: Analysis Result (primary demo)
│           │   │   │   │
│           │   │   │   ├── 📁 verify/     # Screen 3: Fact Verification
│           │   │   │   │   └── page.tsx   # Editable fact list
│           │   │   │   │
│           │   │   │   ├── 📁 explain/    # Screen 5: Explainability
│           │   │   │   │   └── page.tsx   # Vertical stepper + trace
│           │   │   │   │
│           │   │   │   ├── 📁 report/     # Screen 6: Case Report
│           │   │   │   │   └── page.tsx   # Summary + export buttons
│           │   │   │   │
│           │   │   │   └── 📁 history/    # Case history & versioning
│           │   │   │       └── page.tsx   # Previous analysis versions
│           │   │   │
│           │   │   └── [id]/
│           │   │       └── error.tsx      # Case-specific error boundary
│           │   │
│           │   ├── 📁 profile/            # User profile
│           │   │   └── page.tsx           # Profile & settings
│           │   │
│           │   ├── 📁 sources/            # Document/corpus management
│           │   │   └── page.tsx           # View ingested sources
│           │   │
│           │   └── 📁 archive/            # Archived cases
│           │       └── page.tsx           # Filter & view archived cases
│           │
│           ├── 📁 components/             # Reusable React components
│           │   ├── 📁 ui/                 # Base UI components (shadcn/ui)
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── form.tsx
│           │   │   ├── input.tsx
│           │   │   ├── label.tsx
│           │   │   ├── select.tsx
│           │   │   ├── stepper.tsx        # Explainability stepper
│           │   │   ├── table.tsx          # Case table
│           │   │   ├── tabs.tsx
│           │   │   ├── accordion.tsx
│           │   │   ├── dialog.tsx
│           │   │   ├── badge.tsx
│           │   │   ├── alert.tsx
│           │   │   ├── spinner.tsx
│           │   │   └── ...other UI
│           │   │
│           │   └── 📁 domain/             # Domain-specific components
│           │       ├── CaseForm.tsx       # Create case form (Screen 2)
│           │       ├── FactVerification.tsx # Fact list + editor (Screen 3)
│           │       ├── AnalysisResult.tsx  # Main result display (Screen 4)
│           │       ├── ExplainabilityStepper.tsx # Trace stepper (Screen 5)
│           │       ├── ConfidenceBand.tsx  # Color-coded confidence display
│           │       ├── TKDLFlag.tsx       # TKDL warning banner
│           │       ├── EscalationBadge.tsx # Escalation indicator
│           │       ├── CaseTable.tsx      # Dashboard case table (Screen 1)
│           │       ├── CaseHistory.tsx    # Version history view
│           │       ├── ReportExport.tsx   # Report download UI
│           │       └── ...other domain components
│           │
│           ├── 📁 lib/                    # Utility functions & helpers
│           │   ├── api.ts                 # Axios instance configured for FastAPI
│           │   │                          # - request/response interceptors
│           │   │                          # - error handling
│           │   ├── api-client.ts          # High-level API methods
│           │   │                          # - getCases()
│           │   │                          # - createCase()
│           │   │                          # - extractFacts()
│           │   │                          # - runAnalysis()
│           │   │                          # - getExplanation()
│           │   ├── constants.ts           # App-wide constants
│           │   │                          # - API_BASE_URL
│           │   │                          # - CONFIDENCE_BANDS
│           │   │                          # - JURISDICTION_OPTIONS
│           │   ├── types-convert.ts       # Type conversions
│           │   ├── format.ts              # Formatting utilities
│           │   └── utils.ts               # Generic helper functions
│           │
│           ├── 📁 hooks/                  # Custom React Hooks
│           │   ├── 📁 queries/            # React Query hooks
│           │   │   ├── useCase.ts         # useQuery for case details
│           │   │   ├── useCases.ts        # useQuery for case list
│           │   │   ├── useCreateCase.ts   # useMutation for case creation
│           │   │   ├── useAnalyze.ts      # useMutation for analysis
│           │   │   ├── useExtractFacts.ts # useMutation for fact extraction
│           │   │   └── useExplain.ts      # useQuery for explanation
│           │   │
│           │   ├── useAuth.ts             # Authentication state & methods
│           │   ├── useForm.ts             # Form handling
│           │   └── ...other custom hooks
│           │
│           ├── 📁 types/                  # TypeScript interfaces
│           │   ├── case.ts                # Case type definitions
│           │   ├── analysis.ts            # Analysis result types
│           │   ├── confidence.ts          # Confidence score types
│           │   ├── api.ts                 # API request/response types
│           │   ├── auth.ts                # Authentication types
│           │   └── common.ts              # Common shared types
│           │
│           └── 📁 locales/                # i18n translations
│               ├── en.json                # English translations
│               ├── hi.json                # Hindi translations (if multilingual)
│               └── localization.ts        # i18n setup
│
├── 📁 ml_models/                          # ✅ ML PIPELINE & MODELS
│   │
│   ├── 📁 notebooks/                      # Jupyter notebooks (experimentation)
│   │   ├── 01_nlp_data_loading.ipynb       # Load raw data
│   │   ├── 02_text_preprocessing.ipynb     # Clean & preprocess text
│   │   ├── 03_entity_extraction.ipynb      # Extract entities (ingredients, dosages, etc)
│   │   ├── 04_entity_normalization.ipynb   # Normalize entities (canonicalize names)
│   │   ├── 05_entity_linking.ipynb         # Link entities to knowledge bases
│   │   ├── 06_relationship_extraction.ipynb # Extract ingredient-disease relationships
│   │   ├── 07_entity_intelligence.ipynb    # Generate entity features
│   │   ├── 08_nlp_features_for_ml.ipynb    # Convert NLP outputs to ML features
│   │   ├── 09_embedding_generation.ipynb   # Generate word/doc embeddings
│   │   ├── 10_similarity_engine.ipynb      # Build similarity search engine
│   │   ├── 11_pair_feature_engineering.ipynb # Create pairwise features for ranking
│   │   ├── 12_xgboost_dataset_validation.ipynb # Validate training dataset
│   │   ├── 13_xgboost_training.ipynb       # Train XGBoost ranking model
│   │   ├── 14_model_evaluation.ipynb       # Evaluate model performance
│   │   ├── 15_risk_scoring.ipynb           # Compute risk scores
│   │   ├── 16_risk_threshold_calibration.ipynb # Calibrate confidence thresholds
│   │   ├── 17_risk_scoring_validation.ipynb   # Validate risk scores
│   │   ├── 18_risk_explainability.ipynb    # Generate SHAP explanations
│   │   ├── 19_rag_evidence_retrieval.ipynb # Test RAG retrieval
│   │   ├── 20_rag_generation.ipynb         # Test answer generation
│   │   ├── 21_end_to_end_ai_pipeline.ipynb # Full pipeline integration test
│   │   ├── 22_pipeline_schema_contract.ipynb # Define I/O contracts
│   │   └── 23_end_to_end_pipeline.ipynb    # Final end-to-end test
│   │
│   ├── 📁 models/                         # Trained models & artifacts
│   │   ├── 📁 xgboost/                    # XGBoost ranking model
│   │   │   ├── model.pkl                  # Trained model
│   │   │   ├── feature_names.json         # Feature schema
│   │   │   └── performance_metrics.json   # Evaluation metrics
│   │   │
│   │   ├── 📁 rag/                        # RAG models & components
│   │   │   ├── embeddings_model.pkl       # Embedding model (sentence-transformers)
│   │   │   ├── llm_config.json            # LLM configuration
│   │   │   └── corpus_index.pkl           # Indexed corpus
│   │   │
│   │   ├── 📁 risk_scoring/               # Risk scoring models
│   │   │   ├── confidence_model.pkl       # Confidence scoring model
│   │   │   ├── threshold_calibration.json # Optimal thresholds
│   │   │   └── risk_mapping.json          # Risk score to band mapping
│   │   │
│   │   ├── 📁 explainability/             # Explainability artifacts
│   │   │   ├── shap_explainer.pkl         # SHAP explainer
│   │   │   └── feature_importance.json    # Feature importance scores
│   │   │
│   │   ├── 📁 pipeline/                   # Full pipeline artifacts
│   │   │   ├── pipeline.pkl               # Serialized pipeline
│   │   │   └── schema_contract.json       # I/O schema contract
│   │   │
│   │   ├── 📁 pipeline_contract/          # Pipeline contract validation
│   │   │   └── contract.json              # Input/output contract
│   │   │
│   │   └── 📁 evaluation/                 # Evaluation results & reports
│   │       ├── performance_report.json    # Overall performance
│   │       └── error_analysis.json        # Error breakdown
│   │
│   ├── 📁 data/                           # Datasets
│   │   ├── 📁 IP_SAKTI_FINAL_DATASET/     # Final training data
│   │   │   ├── formulations.csv
│   │   │   ├── annotations.csv
│   │   │   └── test_cases.csv
│   │   │
│   │   └── 📁 processed/                  # Processed/intermediate data
│   │       ├── extracted_entities.pkl
│   │       ├── engineered_features.pkl
│   │       └── embeddings.pkl
│   │
│   └── 📁 outputs/                        # Pipeline outputs
│       └── 📁 xgboost/                    # XGBoost run outputs
│           ├── training_log.csv
│           ├── predictions.csv
│           └── confusion_matrix.png

```

---

## Backend Architecture

### Overview
The backend is a **FastAPI application** that orchestrates the entire IP-SAKTI analysis pipeline. It receives case descriptions from the frontend and returns structured legal conclusions with full explainability.

### Core Layers

#### 1. **API Layer** (`app/api/`)
- **Entry Points:**
  - `health.py` → `GET /` (health check)
  - `auth.py` → Authentication & user management
  - `cases.py` → Case CRUD & analysis operations
  - `assistant.py` → Helper endpoints

- **Request/Response Cycle:**
  ```python
  POST /cases
    → Request: { description, as_of_date, jurisdiction }
    → Response: { case_id, status, submission_id }
  
  POST /cases/{id}/analyze
    → Request: { facts: [verified facts] }
    → Response: { classification, confidence, fired_rules, evidence, ... }
  
  GET /cases/{id}/explain
    → Request: None
    → Response: { steps: [Stepper trace] }
  ```

#### 2. **Core Pipeline Layer** (`app/pipeline/`)
The analytical engine with 7 distinct stages:

```
Input: Case description + as_of_date + jurisdiction
   ↓
[1] FACT EXTRACTION (LLM)
   ├─ LLM parses description → structured facts
   ├─ Output: ExtractedFact[]
   └─ Models: GPT-4 via llm/client.py
   
[2] NORMALIZATION
   ├─ Canonicalizes ingredient names (Ashwagandha → standard)
   ├─ Uses: data/alias_dict.json
   └─ Output: normalized_value in ExtractedFact
   
[3] RULE ENGINE
   ├─ Loads rules.json
   ├─ Evaluates: do extracted facts fire any rules?
   ├─ Output: fired_rules[], classification
   └─ Models: rules/rules.json, rules/loader.py
   
[4] EVIDENCE RETRIEVAL
   ├─ For each fired rule, retrieves supporting evidence
   ├─ Searches ChromaDB vector store
   ├─ Output: evidence_chunks[], ranked by relevance
   └─ Models: rag/vector_store.py, rag/ingestion.py
   
[5] CITATION VALIDATION
   ├─ Validates: does retrieved evidence actually support the rule?
   ├─ Deterministic check, not LLM-based
   ├─ Output: validation_passed (boolean)
   └─ Models: citation_validation.py
   
[6] CONFIDENCE SCORING
   ├─ Calculates 5 dimensions:
   │  - fact_confidence (extraction quality)
   │  - rule_fit_confidence (rule match quality)
   │  - evidence_confidence (retrieval quality)
   │  - citation_confidence (validation quality)
   │  - overall_confidence (min-gated)
   ├─ Assigns band: HIGH/MEDIUM/LOW/INSUFFICIENT
   └─ Models: confidence.py
   
[7] EXPLAINABILITY
   ├─ Assembles full trace: facts → rules → evidence → citations → confidence
   ├─ No new computation, just presentation
   ├─ Output: steps[] for frontend stepper
   └─ Models: explain.py

Output: AnalysisResult (classification + confidence + rules + evidence + trace)
```

#### 3. **LLM Layer** (`app/llm/`)
- `client.py` → OpenAI API wrapper (GPT-4)
  - `extract_facts()` → Fact extraction
  - `validate_extraction()` → Validation checks
  - `embed_text()` → Embedding generation
- `prompts.py` → Prompt templates
- `validators.py` → Output validation

#### 4. **RAG Layer** (`app/rag/`)
- `vector_store.py` → ChromaDB interface
- `embeddings.py` → Sentence-transformer embeddings
- `ingestion.py` → Corpus ingestion (statutes, case law)
- `keyword_boost.py` → Relevance boosting
- `prior_art.py` → TKDL/prior art detection

#### 5. **Rules Engine** (`app/rules/`)
- `rules.json` → Declarative rule definitions
  ```json
  [
    {
      "id": "R-3P-02",
      "name": "Classical Formulation Rule",
      "condition_logic": {
        "AND": [
          { "field": "dosage", "op": "modified_in_text" },
          { "field": "preparation", "op": "traditional" }
        ]
      },
      "conclusion": "classical",
      "confidence_baseline": 0.95,
      "citations": [
        { "statute": "Patents Act 1970", "section": "3(c)", "url": "...", "as_of_date": "2023-01-01" }
      ]
    }
  ]
  ```
- `loader.py` → Rule loader & validator

#### 6. **Data Layer** (`app/models.py` & `app/db.py`)
- **ORM Models (SQLAlchemy):**
  ```python
  class FormulationSubmission(Base):
      id: int (primary key)
      submission_id: str (unique)
      title: str
      description: str
      as_of_date: str
      jurisdiction: str (India | International)
      status: str (PENDING | PROCESSING | SCORED | DONE | FAILED)
      result_json: str (full result)
      created_at, updated_at
  
  class ExtractedFact(Base):
      id: int
      submission_id: str
      field: str (ingredient, dosage, disease, etc)
      value: str
      normalized_value: str
      status: str (PENDING | CONFIRMED | CORRECTED)
      confidence: float
      source_span: str (snippet from original text)
  
  class TKDLRecord(Base):
      # Skeleton for friend's TKDL data
  ```

#### 7. **Utility Layer** (`app/utils/`)
- `errors.py` → Custom exceptions
- `security.py` → JWT/auth utilities
- `email.py` → Escalation emails
- `logging.py` → Structured logging

### Configuration (`app/config.py` & `app/deps.py`)
- Environment variables (API keys, DB URLs)
- Dependency injection (session management, auth)

---

## Frontend Architecture

### Overview
A **Next.js 15 (App Router)** application that presents the analysis results and allows interactive case management.

### Page Structure

| Route | Screen Name | Purpose | Components |
|-------|-------------|---------|------------|
| `/dashboard` | Dashboard | Case list overview | `CaseTable`, `CreateCaseButton` |
| `/cases/new` | Create Case | Form to start analysis | `CaseForm`, `JurisdictionToggle`, `DatePicker` |
| `/cases/[id]/verify` | Fact Verification | Edit extracted facts | `FactVerification`, `InlineEditor`, `SourceSpan` |
| `/cases/[id]` | Analysis Result | Main result display | `AnalysisResult`, `ConfidenceBand`, `FiredRules`, `TKDLFlag` |
| `/cases/[id]/explain` | Explainability | Detailed trace | `ExplainabilityStepper`, `StepDetails` |
| `/cases/[id]/report` | Case Report | Export & summary | `ReportSummary`, `ExportButton` |
| `/cases/[id]/history` | Case History | Version tracking | `VersionTimeline`, `VersionComparison` |

### Component Hierarchy

```
App (layout.tsx)
  ├─ Auth Middleware
  ├─ Navigation / Sidebar
  │
  ├─ Dashboard
  │  └─ CaseTable (shadcn/ui table)
  │
  ├─ CreateCase
  │  └─ CaseForm
  │     ├─ TextArea (description)
  │     ├─ DatePicker (as_of_date)
  │     ├─ Select (jurisdiction)
  │     └─ Submit Button
  │
  ├─ FactVerification
  │  └─ FactList
  │     ├─ Fact Item (each)
  │        ├─ Label
  │        ├─ Value (editable)
  │        ├─ SourceSpan (read-only)
  │        └─ Confidence Badge
  │     └─ Confirm / Cancel Buttons
  │
  ├─ AnalysisResult (PRIMARY DEMO)
  │  ├─ Header (Classification)
  │  ├─ ConfidenceBand
  │  │  ├─ Overall Confidence Score
  │  │  ├─ 5-Dimension Breakdown
  │  │  └─ Band Color (HIGH/MEDIUM/LOW/INSUFFICIENT)
  │  ├─ TKDLFlag (warning banner)
  │  ├─ FiredRules Section
  │  │  └─ Rule Item (each)
  │  │     ├─ Rule ID
  │  │     ├─ Rule Name
  │  │     └─ Conditions Met
  │  ├─ Evidence Section
  │  │  └─ Evidence Item (each)
  │  │     ├─ Snippet
  │  │     ├─ Source & Date
  │  │     └─ Relevance Score
  │  ├─ Next Steps
  │  └─ Buttons (Explain, Escalate, Re-analyze)
  │
  ├─ ExplainabilityStepper
  │  └─ Vertical Stepper (shadcn/ui)
  │     ├─ Step 1: User Input
  │     ├─ Step 2: Extracted Facts (with corrections highlighted)
  │     ├─ Step 3: Rules Triggered
  │     ├─ Step 4: Statutory Provision / Citation
  │     ├─ Step 5: Supporting Evidence
  │     ├─ Step 6: Citation Validation
  │     ├─ Step 7: Confidence Breakdown
  │     └─ Step 8: Plain-Language Reasoning
  │
  └─ ReportExport
     ├─ Report Summary (formatted text)
     ├─ Full Trace (JSON)
     └─ Download Buttons (JSON, PDF)
```

### React Query Hooks (`hooks/queries/`)

```typescript
useCase(id) → useQuery(['case', id], fetchCase)
useCases() → useQuery(['cases'], fetchCases)
useCreateCase() → useMutation(POST /cases)
useExtractFacts(id) → useMutation(POST /cases/{id}/facts)
useAnalyze(id) → useMutation(POST /cases/{id}/analyze)
useExplain(id) → useQuery(['explain', id], fetchExplanation)
useReport(id) → useQuery(['report', id], fetchReport)
useHistory(id) → useQuery(['history', id], fetchHistory)
```

### Type System (`types/`)

```typescript
// Case.ts
interface Case {
  id: string
  submission_id: string
  title: string
  description: string
  as_of_date: string
  jurisdiction: 'India' | 'International'
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
  created_at: Date
  updated_at: Date
}

// Analysis.ts
interface AnalysisResult {
  case_id: string
  classification: string
  confidence: ConfidenceScore
  fired_rules: Rule[]
  evidence: EvidenceItem[]
  tkdl_relevant: boolean
  escalation_required: boolean
  trace: ExplainabilityStep[]
}

interface ConfidenceScore {
  fact_conf: number
  rule_fit_conf: number
  evidence_conf: number
  citation_conf: number
  overall_conf: number
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
}

interface ExplainabilityStep {
  title: string
  status: 'success' | 'warning' | 'info' | 'error'
  details: string
}
```

### API Client (`lib/api-client.ts`)

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true
})

export const apiClient = {
  cases: {
    list: () => api.get('/cases'),
    create: (data) => api.post('/cases', data),
    get: (id) => api.get(`/cases/${id}`),
    extractFacts: (id, facts) => api.post(`/cases/${id}/facts`, facts),
    analyze: (id) => api.post(`/cases/${id}/analyze`),
    explain: (id) => api.get(`/cases/${id}/explain`),
    report: (id) => api.get(`/cases/${id}/report`)
  }
}
```

---

## ML Pipeline & Data Processing

### Workflow

The ML pipeline is primarily **offline/experimental** via Jupyter notebooks. Trained models are exported and loaded into the backend at runtime.

```
Data Ingestion (Notebooks 01-02)
    ↓
Entity Extraction & Normalization (Notebooks 03-07)
    ├─ Extract ingredients, dosages, preparation methods
    ├─ Link to canonical forms (Ashwagandha → standard)
    └─ Generate relationship features
    ↓
Feature Engineering (Notebooks 08-11)
    ├─ Convert NLP outputs to ML features
    ├─ Generate embeddings (sentence-transformers)
    └─ Create pairwise similarity features
    ↓
Model Training (Notebooks 12-14)
    ├─ XGBoost ranking model
    ├─ Risk scoring model
    └─ Confidence calibration
    ↓
Confidence & Risk Scoring (Notebooks 15-18)
    ├─ Compute risk scores for rules
    ├─ Calibrate confidence thresholds
    ├─ Generate SHAP explanations
    └─ Determine HIGH/MEDIUM/LOW/INSUFFICIENT bands
    ↓
RAG & Evidence Retrieval (Notebooks 19-20)
    ├─ Ingest legal corpus into ChromaDB
    ├─ Test retrieval quality
    └─ Test answer generation
    ↓
End-to-End Integration (Notebooks 21-23)
    ├─ Full pipeline test
    ├─ Contract validation (I/O schema)
    └─ Final validation & export
    ↓
Models Exported
    ├─ models/xgboost/model.pkl
    ├─ models/rag/embeddings_model.pkl
    ├─ models/risk_scoring/confidence_model.pkl
    └─ models/explainability/shap_explainer.pkl
    ↓
Loaded into Backend Runtime
    ├─ Used in pipeline/confidence.py
    ├─ Used in rag/vector_store.py
    └─ Used in pipeline/rule_engine.py
```

### Key Notebooks

- **01-02:** Data loading & preprocessing (raw corpus)
- **03-07:** NLP pipeline (entity extraction, normalization, linking)
- **08-11:** ML feature engineering
- **12-14:** XGBoost training & evaluation
- **15-18:** Risk & confidence scoring, explainability
- **19-20:** RAG testing
- **21-23:** End-to-end integration & validation

### Data Format

- **Input:** CSV files (formulations with annotations)
- **Intermediate:** Pickled Python objects (entities, features, embeddings)
- **Output:** Model artifacts (`.pkl` files)
- **Runtime:** Models deserialized in backend (lazy-loaded)

---

## Data Flow & Integration

### Full User Journey

```
1. USER INITIATES
   ├─ Frontend: User fills "Create Case" form
   │  ├─ Description: "90% Ashwagandha, 10% Ginger, for immune support"
   │  ├─ As-of-Date: "2024-01-15"
   │  └─ Jurisdiction: "India"
   │
   └─ Frontend → POST /cases
      └─ Backend: Store FormulationSubmission (PENDING)

2. FACT EXTRACTION
   ├─ Backend: Pipeline stage 1 (fact_extraction.py)
   │  ├─ LLM call: GPT-4 extracts facts
   │  ├─ Output: ExtractedFact[] (ingredients, dosage, indication)
   │  └─ Store: DB + return to frontend
   │
   └─ Frontend: Display "Extracted Facts" → Redirect to verify

3. FACT VERIFICATION
   ├─ Frontend: Screen 3 shows facts + source spans
   │  ├─ User reviews: "90%" → "Check this dosage"
   │  ├─ User edits: "for immune support" → "for general wellness"
   │  └─ User confirms: Mark fact as CONFIRMED
   │
   └─ Frontend → PUT /cases/{id}/facts (confirmed facts)
      └─ Backend: Update ExtractedFact status → CONFIRMED

4. ANALYSIS
   ├─ Frontend: User clicks "Analyze"
   │
   └─ Frontend → POST /cases/{id}/analyze
      └─ Backend Pipeline:
         ├─ Stage 2: Normalize facts (alias_dict.json)
         │  ├─ "Ashwagandha" → canonical form
         │  └─ Update normalized_value in DB
         │
         ├─ Stage 3: Rule engine (rules.json)
         │  ├─ Evaluate: facts fire which rules?
         │  ├─ Example: "classical" rule fires if:
         │  │  - No commercial indication + traditional preparation
         │  └─ Output: fired_rules[], classification
         │
         ├─ Stage 4: Retrieve evidence (ChromaDB)
         │  ├─ For each fired rule, search vector store
         │  ├─ Query: "Patents Act 1970, Section 3(c)"
         │  └─ Output: evidence_chunks[] (snippets + metadata)
         │
         ├─ Stage 5: Validate citations
         │  ├─ Check: does evidence actually support rule?
         │  └─ Output: validation_passed (boolean per rule)
         │
         ├─ Stage 6: Score confidence (confidence.py)
         │  ├─ fact_conf = LLM extraction quality
         │  ├─ rule_fit_conf = rule match quality
         │  ├─ evidence_conf = retrieval quality
         │  ├─ citation_conf = validation quality
         │  ├─ overall_conf = min(all 4)
         │  └─ band = HIGH/MEDIUM/LOW/INSUFFICIENT
         │
         ├─ Stage 7: Build trace (explain.py)
         │  ├─ Assemble: facts → rules → evidence → trace
         │  └─ Format for frontend stepper
         │
         └─ Return: AnalysisResult JSON
            ├─ classification, confidence (5D), fired_rules, evidence, trace
            └─ Store in DB + return to frontend

5. DISPLAY RESULTS
   ├─ Frontend: Screen 4 (AnalysisResult)
   │  ├─ Header: "Classification: CLASSICAL"
   │  ├─ ConfidenceBand: Overall 0.85 (MEDIUM)
   │  │  ├─ Fact: 0.90 (green)
   │  │  ├─ Rule Fit: 0.85 (yellow)
   │  │  ├─ Evidence: 0.80 (yellow)
   │  │  ├─ Citation: 0.75 (orange)
   │  │  └─ Overall: 0.75 (MEDIUM - min gate)
   │  ├─ Fired Rules: "R-3P-02: Classical Formulation"
   │  ├─ Evidence: "Patents Act 1970, Section 3(c), 2023-06-15"
   │  └─ Next Steps: "Your formulation is classic. It may not be patentable..."
   │
   └─ User can:
      ├─ Click "Why?" → Screen 5 (Explainability)
      ├─ Click "Escalate" → Email to human reviewer
      └─ Click "Re-analyze" → Return to verify (versioning)

6. EXPLAINABILITY (Optional)
   ├─ Frontend: Screen 5 (ExplainabilityStepper)
   │  ├─ Step 1: Original Description
   │  ├─ Step 2: Extracted Facts (with corrections highlighted as diff)
   │  ├─ Step 3: Rules Triggered (R-3P-02, ...)
   │  ├─ Step 4: Statutory Citation (Patents Act 1970, Section 3(c))
   │  ├─ Step 5: Supporting Evidence Chunk
   │  ├─ Step 6: Citation Validation (✓ Pass)
   │  ├─ Step 7: Confidence Breakdown (5D + band)
   │  └─ Step 8: Reasoning (plain language)
   │
   └─ Frontend → GET /cases/{id}/explain
      └─ Backend: Return pre-computed trace

7. EXPORT (Optional)
   ├─ Frontend: User clicks "Download Report"
   │
   └─ Frontend → GET /cases/{id}/report
      └─ Backend: Return JSON/PDF summary
         ├─ Title, description, date, jurisdiction
         ├─ Classification, confidence, fired rules
         ├─ Evidence + citations
         ├─ Full trace
         └─ Escalation status
```

---

## Database Schema

### SQLite Tables

#### FormulationSubmission
```sql
CREATE TABLE formulation_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id VARCHAR UNIQUE NOT NULL,
    title VARCHAR,
    description TEXT,
    as_of_date VARCHAR,
    jurisdiction VARCHAR (India / International),
    ingredients TEXT,
    disease VARCHAR,
    preparation_method TEXT,
    dosage VARCHAR,
    route VARCHAR,
    tool VARCHAR,           -- Which tool created it (UI, API, etc)
    tool_input TEXT,        -- Original input to tool
    status VARCHAR DEFAULT 'PENDING',  -- PENDING, PROCESSING, SCORED, DONE, FAILED
    result_json TEXT,       -- Full result as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### ExtractedFact
```sql
CREATE TABLE extracted_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id VARCHAR,  -- FK to FormulationSubmission.submission_id
    field VARCHAR NOT NULL,  -- ingredient, dosage, disease, prep_method, etc
    value TEXT,             -- Raw extracted value
    normalized_value TEXT,  -- Canonicalized value
    status VARCHAR DEFAULT 'PENDING',  -- PENDING, CONFIRMED, CORRECTED
    confidence FLOAT DEFAULT 0.0,      -- LLM extraction confidence
    source_span TEXT        -- Snippet from original description
);
```

#### TKDLRecord
```sql
CREATE TABLE tkdl_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    composition TEXT,
    indication TEXT,
    status VARCHAR
    -- More fields TBD per friend's dataset
);
```

### ChromaDB Vector Store
- Collection: `legal_corpus`
  - Documents: Statute sections, case law, regulations
  - Metadata: `statute`, `section`, `jurisdiction`, `as_of_date`, `source_url`
  - Embeddings: Generated via sentence-transformers

---

## API Contracts

### Request/Response Schemas (Pydantic models in `schemas.py`)

#### POST /cases
```python
class CreateCaseRequest(BaseModel):
    description: str
    as_of_date: str  # ISO date
    jurisdiction: Literal["India", "International"]
    title: Optional[str] = None

class CreateCaseResponse(BaseModel):
    case_id: str
    submission_id: str
    status: str
    created_at: str
```

#### GET /cases
```python
class CaseItem(BaseModel):
    id: str
    title: str
    status: str
    confidence_band: str  # HIGH, MEDIUM, LOW, INSUFFICIENT
    created_at: str

class CaseListResponse(BaseModel):
    cases: List[CaseItem]
    total: int
```

#### POST /cases/{id}/facts
```python
class ExtractedFactResponse(BaseModel):
    id: str
    field: str
    value: str
    normalized_value: str
    confidence: float
    source_span: str
    status: str

class FactsResponse(BaseModel):
    facts: List[ExtractedFactResponse]
```

#### PUT /cases/{id}/facts
```python
class ConfirmedFact(BaseModel):
    id: str
    value: str  # User-corrected value
    status: Literal["CONFIRMED", "CORRECTED"]

class UpdateFactsRequest(BaseModel):
    facts: List[ConfirmedFact]

class UpdateFactsResponse(BaseModel):
    success: bool
    message: str
```

#### POST /cases/{id}/analyze
```python
class Rule(BaseModel):
    id: str
    name: str
    conditions_met: List[str]
    conclusion: str
    confidence: float

class Evidence(BaseModel):
    snippet: str
    source: str
    date: str
    statute: str
    section: str
    relevance_score: float
    validation_passed: bool

class ConfidenceBreakdown(BaseModel):
    fact_conf: float
    rule_fit_conf: float
    evidence_conf: float
    citation_conf: float
    overall_conf: float
    band: Literal["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]

class AnalysisResponse(BaseModel):
    case_id: str
    classification: str
    confidence: ConfidenceBreakdown
    fired_rules: List[Rule]
    evidence: List[Evidence]
    tkdl_relevant: bool
    tkdl_message: str  # "Restricted access in prototype" or public info
    escalation_required: bool
    escalation_reason: Optional[str]
    trace: List[ExplainabilityStep]  # For frontend stepper
```

#### GET /cases/{id}/explain
```python
class ExplainabilityStep(BaseModel):
    title: str
    status: Literal["success", "warning", "info", "error"]
    details: str

class ExplanationResponse(BaseModel):
    steps: List[ExplainabilityStep]
```

#### GET /cases/{id}/report
```python
class ReportResponse(BaseModel):
    case_id: str
    title: str
    description: str
    as_of_date: str
    jurisdiction: str
    extracted_facts: List[ExtractedFactResponse]
    analysis: AnalysisResponse
    export_timestamp: str
```

---

## Summary

**IP-SAKTI Sahayak** is a **7-day prototype** implementing a deterministic, rule-based legal decision-support system with the following key characteristics:

- **Frontend:** Highly interactive Next.js UI with 6 core screens
- **Backend:** FastAPI pipeline with 7 stages (extraction → normalization → rules → retrieval → validation → confidence → explanation)
- **ML:** Offline notebooks for experimentation; trained models exported to backend
- **RAG:** ChromaDB-based evidence retrieval with deterministic validation (not LLM-guessed)
- **Database:** SQLite with case versioning & escalation tracking
- **Explainability:** Full audit trail from facts → rules → evidence → confidence

The system prioritizes **auditability** and **transparency** over general-purpose QA, with every decision traceable to a rule, statute, and citation.

