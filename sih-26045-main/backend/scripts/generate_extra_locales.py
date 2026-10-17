import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(r"e:\sih-26045-main\sih-26045-main\backend")
sys.path.insert(0, str(BACKEND_DIR))

LOCALES_DIR = Path(r"e:\sih-26045-main\sih-26045-main\IP-SAKTI-frontend\frontend-koutsa\src\locales")
EN_JSON = LOCALES_DIR / "en.json"

from app.translation.bhashini_translator import get_translator

LANG_FILE_MAP = {
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "ur": "Urdu",
    "as": "Assamese",
    "sa": "Sanskrit",
    "ne": "Nepali",
    "gom": "Konkani",
    "sd": "Sindhi",
    "doi": "Dogri",
    "mai": "Maithili",
    "sat": "Santali",
    "ks": "Kashmiri",
    "mni": "Manipuri",
    "brx": "Bodo",
    "awa": "Awadhi",
    "bho": "Bhojpuri",
    "bra": "Braj",
    "hne": "Chhattisgarhi",
    "gon": "Gondi",
    "hoc": "Ho",
    "xnr": "Kangri",
    "mag": "Magahi",
    "lus": "Mizo",
    "si": "Sinhala",
    "tcy": "Tulu",
    "bhb": "Bhili",
    "bgc": "Haryanvi",
    "raj": "Rajasthani",
    "kha": "Khasi",
    "hinglish": "Hinglish",
}

EXTRA_SECTIONS = {
    "auth": {
        "welcome_back": "Welcome back",
        "sign_in_account": "Sign in to your account",
        "sign_in_desc": "Continue your Ayurvedic IP research from where you left off.",
        "password": "Password",
        "login_with_otp": "Login with OTP",
        "email_address": "Email address",
        "email_placeholder": "you@example.com",
        "password_placeholder": "Enter your password",
        "forgot_password": "Forgot password?",
        "sign_in": "Sign in",
        "signing_in": "Signing in…",
        "otp_sent_to": "OTP sent to",
        "edit": "Edit",
        "verification_code": "Verification code",
        "code_6_digit": "6-Digit Verification Code",
        "expires_in": "Expires in {time}",
        "resend_otp": "Resend OTP",
        "send_otp": "Send OTP",
        "sending_otp": "Sending OTP…",
        "verify_continue": "Verify & continue",
        "verifying": "Verifying…",
        "or": "OR",
        "continue_with_google": "Continue with Google",
        "no_account": "Don't have an account?",
        "create_account": "Create an account",
        "workspace_protected": "Your research workspace is securely protected.",
        "get_started": "Get started",
        "create_account_title": "Create your account",
        "create_account_desc": "Create an account to start managing your Ayurvedic IP research.",
        "first_name": "First name",
        "last_name": "Last name",
        "confirm_password": "Confirm password",
        "create_password_placeholder": "Create a password",
        "reenter_password_placeholder": "Re-enter your password",
        "use_8_chars": "Use at least 8 characters.",
        "passwords_match": "Passwords match",
        "already_registered": "Already registered?",
        "already_have_account": "Already have an account?",
        "info_protected": "Your information is securely protected.",
        "creating_account": "Creating account…",
        "account_recovery": "Account Recovery",
        "forgot_password_title": "Forgot your password?",
        "forgot_password_desc": "Enter your registered email address and we'll send you a 6-digit verification code to reset your password.",
        "send_recovery_code": "Send recovery code",
        "sending_recovery_code": "Sending recovery code…",
        "return_to_signin": "Return to sign in",
        "step_2_of_2": "Step 2 of 2",
        "set_new_password": "Set new password",
        "set_new_password_desc": "Enter the 6-digit code sent to your email, then choose a secure new password.",
        "code_dispatched_to": "Code dispatched to",
        "change": "Change",
        "new_password": "New Password",
        "confirm_new_password": "Confirm New Password",
        "min_6_chars": "Minimum 6 characters",
        "reset_password_button": "Reset Password & Sign in",
        "resetting_password": "Resetting password…",
        "back_to_email": "Back to email entry",
        "password_reset_success": "Password reset successful!",
        "password_reset_desc": "Your credentials have been securely updated. Logging you into your research workspace...",
        "credentials_encrypted": "Your credentials are encrypted and securely stored.",
        "verify_email": "Verify your email",
        "enter_verification_code": "Enter your verification code",
        "sent_otp_to_email": "We sent a 6-digit OTP to {email}.",
        "demo_mode_off": "Demo mode — email delivery is off",
        "verify_email_button": "Verify email",
        "resend": "Resend",
        "secure_verification": "Secure verification for your research workspace.",
        "back_to_login": "Back to sign in",
        "visual_login_title": "Research Ayurvedic IP with confidence.",
        "visual_register_title": "Start your Ayurvedic IP research journey.",
        "visual_login_intro": "Access your IP-SAKTI Sahayak workspace to manage Ayurvedic intellectual property, traditional knowledge, ABS and regulatory research.",
        "visual_register_intro": "Create your IP-SAKTI Sahayak account and get access to a dedicated workspace for Ayurvedic intellectual property, traditional knowledge, ABS and regulatory research.",
        "visual_evidence": "Evidence-grounded research",
        "visual_pt_classification": "Formulation classification",
        "visual_pt_tkdl": "TKDL and prior-art research",
        "visual_pt_abs": "ABS compliance analysis",
        "visual_pt_regulatory": "Regulatory pathway research",
        "visual_pt_organize": "Organize your research cases",
        "visual_pt_classify": "Classify Ayurvedic formulations",
        "visual_pt_explore": "Explore TKDL and prior art",
        "visual_pt_analyze": "Analyze ABS compliance"
    },
    "confidence_card": {
        "confidence": "Confidence",
        "assessment_confidence": "Assessment confidence",
        "fact_conf": "Fact confidence",
        "rule_fit_conf": "Rule-fit confidence",
        "evidence_conf": "Evidence confidence",
        "citation_conf": "Citation confidence",
        "overall_conf": "Overall assessment"
    },
    "grounded": {
        "sahayak_answer": "Sahayak answer",
        "grounded_response": "Grounded research response",
        "sources": "Sources",
        "evidence_cited": "Evidence cited in this answer",
        "validated": "Validated",
        "open_source": "Open source"
    },
    "graph": {
        "legend": "Legend",
        "node_details": "Node details",
        "source": "Source",
        "open_official": "Open official source",
        "hover_hint": "Hover to highlight links; click a node to see its source citation."
    },
    "tts": {
        "read_aloud": "Read aloud",
        "stop_reading": "Stop reading",
        "preparing_audio": "Preparing audio…"
    },
    "connectors": {
        "name_placeholder": "My WIPO subscription",
        "bearer_token": "Bearer token",
        "apikey_header": "API-key header",
        "key_placeholder": "paste your key — stored locally, masked"
    },
    "reasoning": {
        "remove_aspect": "Remove aspect",
        "source_link": "source"
    }
}

def update_en():
    with open(EN_JSON, "r", encoding="utf-8") as f:
        en_data = json.load(f)
    for section, keys in EXTRA_SECTIONS.items():
        if section not in en_data:
            en_data[section] = {}
        en_data[section].update(keys)
    with open(EN_JSON, "w", encoding="utf-8") as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)
    print("Updated en.json with extra sections.")
    return en_data

def flatten_dict(d, prefix=""):
    items = []
    for k, v in d.items():
        pk = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, pk))
        elif isinstance(v, str):
            items.append((pk, v))
    return items

def translate_extra():
    update_en()
    translator = get_translator()
    
    flat_items = flatten_dict(EXTRA_SECTIONS)
    paths = [p for p, _ in flat_items]
    texts = [t for _, t in flat_items]
    print(f"Total extra strings to translate: {len(texts)}")

    # Step 1: Translate Hindi first
    print("Translating Hindi first...")
    hindi_translations = {}
    BATCH_SIZE = 25
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        try:
            res = translator.translate_batch(batch, "Hindi")
            for p, tr in zip(paths[i:i + BATCH_SIZE], res):
                hindi_translations[p] = tr
        except Exception as e:
            print(f"Hindi batch {i} error: {e}")
            for p, eng in zip(paths[i:i + BATCH_SIZE], batch):
                hindi_translations[p] = eng
    
    print("Hindi translation done.")
    
    # Update hi.json
    hi_file = LOCALES_DIR / "hi.json"
    if hi_file.exists():
        with open(hi_file, "r", encoding="utf-8") as f:
            hi_data = json.load(f)
        for p, tr in hindi_translations.items():
            keys = p.split(".")
            curr = hi_data
            for k in keys[:-1]:
                if k not in curr:
                    curr[k] = {}
                curr = curr[k]
            curr[keys[-1]] = tr
        with open(hi_file, "w", encoding="utf-8") as f:
            json.dump(hi_data, f, ensure_ascii=False, indent=2)
        print("Updated hi.json")

    # Step 2: Translate all other languages
    for code, lang_name in LANG_FILE_MAP.items():
        if code == "hi":
            continue
        lang_file = LOCALES_DIR / f"{code}.json"
        if not lang_file.exists():
            print(f"File {lang_file} does not exist, skipping")
            continue
        
        print(f"Translating for {lang_name} ({code})...")
        translated_map = {}
        success = True
        
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            try:
                res = translator.translate_batch(batch, lang_name)
                if res and len(res) == len(batch):
                    for p, tr in zip(paths[i:i + BATCH_SIZE], res):
                        translated_map[p] = tr
                else:
                    success = False
                    break
            except Exception as e:
                success = False
                break
        
        if not success or len(translated_map) < len(texts):
            print(f"Direct translation for {lang_name} failed or incomplete. Using Hindi fallback.")
            translated_map = hindi_translations.copy()
        
        # Load existing json and merge
        with open(lang_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        for p, tr in translated_map.items():
            keys = p.split(".")
            curr = data
            for k in keys[:-1]:
                if k not in curr:
                    curr[k] = {}
                curr = curr[k]
            curr[keys[-1]] = tr
            
        with open(lang_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Successfully updated {code}.json for {lang_name}!")

    print("ALL 39 LOCALE FILES UPDATED WITH EXTRA SECTIONS!")

if __name__ == "__main__":
    translate_extra()
