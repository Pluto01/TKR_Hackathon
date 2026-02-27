from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, UploadFile, File
from typing import List
import json
import csv
import io
from datetime import datetime

from schemas.request_response import (
    InputData,
    CheckInputResponse,
    PredictResponse,
    UserRegisterRequest,
    UserRegisterResponse,
    UserLoginRequest,
    DailyCheckinRequest,
    DailyCheckinResponse,
    UserMetricsResponse,
    DailyCheckinRecord,
)

from rules.rule_engine import evaluate_rules
from utils.feature_engineering import compute_features
from ml.predictor import predict_risk
from xai.explain import generate_llm_explanation
import os
from db.storage import (
    init_db,
    create_user,
    get_user_by_email,
    upsert_daily_checkin,
    get_user_metrics,
    get_user_checkins,
    compute_rolling_metrics,
)


app = FastAPI(
    title="MSME Financial Risk Intelligence API",
    version="1.0",
)


def _llm_timeout_seconds() -> float:
    raw = os.getenv("LLM_TIMEOUT_SECONDS", "20").strip()
    try:
        value = float(raw)
    except ValueError:
        return 20.0
    return max(1.0, value)


def _build_llm_prompt(risk_score, risk_level, features, reasons, actions):
    return (
        "You are a helpful financial guide for small business owners with no finance background.\n"
        "Return ONLY valid JSON (no markdown) using this schema:\n"
        "{\"summary\": string, \"key_drivers\": string[], \"immediate_actions\": string[]}\n"
        "Rules:\n"
        "- Use simple everyday language (grade 6-8).\n"
        "- Avoid jargon. If needed, explain in plain words.\n"
        "- Speak directly to the user as 'your business'.\n"
        "- summary: max 2 short sentences.\n"
        "- key_drivers: 2-4 short bullet points.\n"
        "- immediate_actions: 2-4 concrete next steps for this week.\n\n"
        "Grounding requirements (strict):\n"
        "- Use the provided reasons/actions as the primary source of truth.\n"
        "- Mention at least 2 concrete risk drivers from reasons.\n"
        "- Mention at least 2 concrete actions from actions.\n"
        "- Include at least 1 numeric fact from risk score or engineered features.\n"
        "- Do not invent new drivers that are not implied by reasons/features.\n\n"
        f"risk_score: {risk_score}\n"
        f"risk_level: {risk_level}\n"
        "engineered_features:\n"
        f"- profit_margin: {features.get('profit_margin', 0.0):.4f}\n"
        f"- receivables_ratio: {features.get('receivables_ratio', 0.0):.4f}\n"
        f"- emi_ratio: {features.get('emi_ratio', 0.0):.4f}\n"
        f"- cash_buffer: {features.get('cash_buffer_months', 0.0):.4f}\n"
        f"- sales_growth_rate: {features.get('sales_growth_rate', 0.0):.4f}\n"
        f"- expense_growth_rate: {features.get('expense_growth_rate', 0.0):.4f}\n"
        f"reasons: {reasons}\n"
        f"actions: {actions}\n"
    )


def _extract_json_object(text: str):
    text = (text or "").strip()
    if not text:
        return None

    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        obj = json.loads(text[start : end + 1])
        if isinstance(obj, dict):
            return obj
    except Exception:
        return None
    return None


def _to_string_list(value):
    if not isinstance(value, list):
        return []
    return [str(v).strip() for v in value if str(v).strip()]


def _simplify_phrase(text: str) -> str:
    simple = str(text or "").strip()
    replacements = {
        "receivables": "pending customer payments",
        "EMI": "loan payment",
        "liquidity": "available cash",
        "cash flow": "money coming in and going out",
        "operational costs": "running costs",
        "debt service": "loan repayment",
        "refinance": "rework your loan terms",
        "discretionary expenses": "non-essential expenses",
    }
    for src, tgt in replacements.items():
        simple = simple.replace(src, tgt)
    return simple


def _is_vague_text(text: str) -> bool:
    content = str(text or "").strip().lower()
    if not content:
        return True
    vague_phrases = [
        "high risk due to",
        "improve financial situation",
        "key issues below",
        "face pressure soon",
        "take immediate action",
        "monitor closely",
    ]
    # Treat as vague when it only contains generic phrases and no numbers.
    has_number = any(ch.isdigit() for ch in content)
    if has_number:
        return False
    return any(phrase in content for phrase in vague_phrases)


def _merge_distinct(primary, fallback, limit=4):
    merged = []
    for item in list(primary or []) + list(fallback or []):
        val = _simplify_phrase(str(item or "").strip())
        if not val:
            continue
        key = val.lower()
        if any(existing.lower() == key for existing in merged):
            continue
        merged.append(val)
        if len(merged) >= limit:
            break
    return merged


def _build_llm_explanation_ui(llm_explanation, risk_score, risk_level, reasons, actions):
    parsed = _extract_json_object(llm_explanation or "")
    if parsed:
        summary = _simplify_phrase(str(parsed.get("summary") or "").strip())
        if not summary or _is_vague_text(summary):
            summary = _simplify_phrase(
                f"Risk is {risk_level} ({risk_score}/100). Main issues: "
                + "; ".join([str(i) for i in reasons[:2]])
                + ". Start with: "
                + "; ".join([str(i) for i in actions[:2]])
                + "."
            )

        key_drivers = _merge_distinct(_to_string_list(parsed.get("key_drivers")), reasons, limit=4)
        immediate_actions = _merge_distinct(_to_string_list(parsed.get("immediate_actions")), actions, limit=4)

        if summary and key_drivers and immediate_actions:
            return {
                "summary": summary,
                "key_drivers": key_drivers,
                "immediate_actions": immediate_actions,
            }

    fallback_summary = (
        f"Risk is {risk_level} ({risk_score}/100). "
        "Your business may face pressure soon, so focus on the key issues below first."
    )
    return {
        "summary": _simplify_phrase(fallback_summary),
        "key_drivers": [_simplify_phrase(i) for i in reasons[:4]],
        "immediate_actions": [_simplify_phrase(i) for i in actions[:4]],
    }


def _to_float(value, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def _round2(value: float) -> float:
    return round(float(value), 2)


def _pick_csv_value(row: dict, keys: List[str]):
    for key in keys:
        if key in row and str(row.get(key) or "").strip() != "":
            return row.get(key)
    return None


def _parse_csv_float(value, default: float = 0.0) -> float:
    if value is None:
        return float(default)
    text = str(value).strip()
    if not text:
        return float(default)
    cleaned = (
        text.replace(",", "")
        .replace("₹", "")
        .replace("$", "")
        .replace("rs", "")
        .replace("RS", "")
        .strip()
    )
    try:
        return float(cleaned)
    except ValueError:
        raise ValueError(f"Invalid numeric value: '{text}'")


def _normalize_csv_date(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError("Missing date/checkin_date value")
    # Accept YYYY-MM-DD directly.
    try:
        return datetime.strptime(text, "%Y-%m-%d").date().isoformat()
    except ValueError:
        pass
    # Accept DD/MM/YYYY and MM/DD/YYYY style.
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Unsupported date format: '{text}'")


def _is_daily_mode(input_dict: dict) -> bool:
    explicit = input_dict.get("use_daily_mode")
    if explicit is not None:
        return bool(explicit)
    # Backward-compatible auto mode when user_id is provided.
    return input_dict.get("user_id") is not None


def compute_survival_metrics(input_dict):
    monthly_sales = _to_float(input_dict.get("monthly_sales"))
    monthly_expenses = _to_float(input_dict.get("monthly_expenses"))
    receivables = _to_float(input_dict.get("receivables"))
    cash_balance = _to_float(input_dict.get("cash_balance"))

    monthly_loss_raw = monthly_expenses - monthly_sales
    monthly_loss = monthly_loss_raw if monthly_loss_raw > 0 else 0.0

    if monthly_loss > 0:
        cash_runway_months = cash_balance / monthly_loss if monthly_loss != 0 else 12.0
    else:
        cash_runway_months = 12.0

    estimated_days_left = cash_runway_months * 30.0
    break_even_sales_required = monthly_expenses

    recommended_collection_target = 0.0
    if monthly_sales > 0 and receivables > 0.2 * monthly_sales:
        recommended_collection_target = 0.25 * receivables

    recommended_expense_reduction = monthly_loss if monthly_loss > 0 else 0.0
    recommended_sales_increase = monthly_loss if monthly_loss > 0 else 0.0

    if recommended_collection_target > 0:
        top_fix = "Collect pending customer payments faster"
        target_amount = recommended_collection_target
        expected_impact = (
            "Recovering this amount can immediately improve cash availability and extend runway."
        )
    elif recommended_expense_reduction > 0:
        top_fix = "Reduce monthly expenses"
        target_amount = recommended_expense_reduction
        expected_impact = (
            "Reducing this monthly amount can move your business closer to break-even."
        )
    elif recommended_sales_increase > 0:
        top_fix = "Increase monthly sales"
        target_amount = recommended_sales_increase
        expected_impact = (
            "Increasing sales by this amount can offset losses and improve stability."
        )
    else:
        top_fix = "Maintain current discipline"
        target_amount = 0.0
        expected_impact = "Your business is not currently in monthly loss."

    return {
        "survival_analysis": {
            "cash_runway_months": _round2(cash_runway_months),
            "estimated_days_left": _round2(estimated_days_left),
            "monthly_loss": _round2(monthly_loss),
            "break_even_sales_required": _round2(break_even_sales_required),
        },
        "priority_action": {
            "top_fix": top_fix,
            "target_amount": _round2(target_amount),
            "expected_impact": expected_impact,
        },
    }

# Allow Expo (mobile + web) to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


@app.post("/check-input", response_model=CheckInputResponse)
def check_input(data: InputData):
    input_dict = {k: v for k, v in data.dict().items() if v is not None}

    if len(input_dict) < 2:
        return {
            "warnings": [],
            "suggestions": [],
        }

    warnings, suggestions = evaluate_rules(input_dict)

    # Keep response JSON-safe even if downstream returns non-str string-like values.
    return {
        "warnings": [str(w) for w in warnings],
        "suggestions": [str(s) for s in suggestions],
    }


@app.post("/users/register", response_model=UserRegisterResponse)
def register_user(data: UserRegisterRequest):
    if not data.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    if "@" not in data.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        return create_user(name=data.name, email=data.email)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/users/login", response_model=UserRegisterResponse)
def login_user(data: UserLoginRequest):
    if not data.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    if "@" not in data.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    user = get_user_by_email(email=data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please create a new account.")
    return user


@app.post("/checkins/daily", response_model=DailyCheckinResponse)
def create_daily_checkin(data: DailyCheckinRequest):
    try:
        return upsert_daily_checkin(data.dict())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/checkins/upload-csv")
async def upload_checkins_csv(user_id: int, file: UploadFile = File(...)):
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV header row is missing")

    total_rows = 0
    processed = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        total_rows += 1
        try:
            date_raw = _pick_csv_value(row, ["checkin_date", "date", "day"])
            sales_raw = _pick_csv_value(
                row,
                ["daily_sales", "sales", "sales_daily", "sales_per_day", "day_sales"],
            )
            expenses_raw = _pick_csv_value(
                row,
                ["daily_expenses", "expenses", "expenses_daily", "expenses_per_day", "day_expenses"],
            )
            receivables_raw = _pick_csv_value(row, ["receivables", "pending_payments"])
            emi_raw = _pick_csv_value(row, ["loan_emi", "emi", "daily_loan_emi"])
            cash_raw = _pick_csv_value(row, ["cash_balance", "cash", "daily_cash_balance"])

            if sales_raw is None or expenses_raw is None:
                raise ValueError("Missing required columns: daily_sales and/or daily_expenses")

            payload = {
                "user_id": int(user_id),
                "checkin_date": _normalize_csv_date(date_raw),
                "daily_sales": _parse_csv_float(sales_raw),
                "daily_expenses": _parse_csv_float(expenses_raw),
                "receivables": _parse_csv_float(receivables_raw, default=0.0),
                "loan_emi": _parse_csv_float(emi_raw, default=0.0),
                "cash_balance": _parse_csv_float(cash_raw, default=0.0),
            }
            upsert_daily_checkin(payload)
            processed += 1
        except Exception as exc:
            errors.append({"line": idx, "error": str(exc)})

    if processed == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No rows were imported from CSV",
                "total_rows": total_rows,
                "errors": errors[:20],
            },
        )

    latest_metrics = get_user_metrics(int(user_id))
    return {
        "user_id": int(user_id),
        "total_rows": total_rows,
        "processed_rows": processed,
        "failed_rows": total_rows - processed,
        "errors": errors[:20],
        "latest_metrics": latest_metrics,
    }


@app.get("/users/{user_id}/metrics", response_model=UserMetricsResponse)
def fetch_user_metrics(user_id: int):
    metrics = get_user_metrics(user_id)
    if not metrics:
        return {
            "user_id": int(user_id),
            "last_checkin_date": None,
            "monthly_sales": None,
            "monthly_expenses": None,
            "monthly_receivables": None,
            "monthly_loan_emi": None,
            "monthly_cash_balance": None,
        }
    return metrics


@app.get("/users/{user_id}/checkins", response_model=List[DailyCheckinRecord])
def fetch_user_checkins(user_id: int):
    return get_user_checkins(user_id=user_id)


@app.post("/predict", response_model=PredictResponse)
def predict(data: InputData):
    input_dict = data.dict()

    # Daily mode: compute standardized monthly windows from SQLite check-ins.
    if _is_daily_mode(input_dict):
        user_id = input_dict.get("user_id")
        if user_id is None:
            survival = compute_survival_metrics(input_dict)
            return {
                "risk_score": 0,
                "risk_level": "INSUFFICIENT DATA",
                "reasons": ["Missing required input: user_id for daily mode"],
                "actions": ["Provide user_id or disable daily mode"],
                "llm_explanation": None,
                "llm_explanation_ui": {
                    "summary": "Insufficient data to generate an explanation.",
                    "key_drivers": ["Missing required input: user_id for daily mode"],
                    "immediate_actions": ["Provide user_id or disable daily mode"],
                },
                "survival_analysis": survival["survival_analysis"],
                "priority_action": survival["priority_action"],
            }

        try:
            rolling = compute_rolling_metrics(
                user_id=int(user_id),
                as_of_date=input_dict.get("as_of_date"),
            )
            # Inject computed standardized fields expected by ML/rules.
            input_dict["monthly_sales"] = rolling["monthly_sales"]
            input_dict["monthly_expenses"] = rolling["monthly_expenses"]
            input_dict["sales_3_months_ago"] = rolling["sales_3_months_ago"]
            input_dict["expenses_3_months_ago"] = rolling["expenses_3_months_ago"]
        except ValueError as exc:
            survival = compute_survival_metrics(input_dict)
            return {
                "risk_score": 0,
                "risk_level": "INSUFFICIENT DATA",
                "reasons": [str(exc)],
                "actions": ["Register/login user before predicting in daily mode"],
                "llm_explanation": None,
                "llm_explanation_ui": {
                    "summary": "Insufficient data to generate an explanation.",
                    "key_drivers": [str(exc)],
                    "immediate_actions": ["Register/login user before predicting in daily mode"],
                },
                "survival_analysis": survival["survival_analysis"],
                "priority_action": survival["priority_action"],
            }

    # Enforce complete input for prediction; return clean response if anything is missing.
    required_fields = [
        "monthly_sales",
        "monthly_expenses",
        "receivables",
        "loan_emi",
        "cash_balance",
    ]
    missing = [field for field in required_fields if input_dict.get(field) is None]

    if missing:
        missing_str = ", ".join(missing)
        survival = compute_survival_metrics(input_dict)
        return {
            "risk_score": 0,
            "risk_level": "INSUFFICIENT DATA",
            "reasons": [f"Missing required inputs: {missing_str}"],
            "actions": ["Please fill all fields to analyze financial risk"],
            "llm_explanation": None,
            "llm_explanation_ui": {
                "summary": "Insufficient data to generate an explanation.",
                "key_drivers": [f"Missing required inputs: {missing_str}"],
                "immediate_actions": ["Please fill all fields to analyze financial risk"],
            },
            "survival_analysis": survival["survival_analysis"],
            "priority_action": survival["priority_action"],
        }

    # Feature engineering is defensive against None/zero divisions.
    features = compute_features(input_dict)

    probability = predict_risk(features)
    risk_score = int(probability * 100)

    if risk_score < 35:
        risk_level = "LOW"
    elif risk_score < 65:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Use raw inputs + engineered features for explainability.
    # This allows momentum rules to run when past values are provided.
    rule_input = {**input_dict, **features}
    warnings, suggestions = evaluate_rules(rule_input)
    reasons = [str(w) for w in warnings]
    actions = [str(s) for s in suggestions]

    llm_explanation = None
    try:
        llm_prompt = _build_llm_prompt(risk_score, risk_level, features, reasons, actions)
        llm_explanation = generate_llm_explanation(
            llm_prompt,
            timeout_seconds=_llm_timeout_seconds(),
        )
    except TimeoutError:
        llm_explanation = None
    except Exception:
        llm_explanation = None

    llm_explanation_ui = _build_llm_explanation_ui(
        llm_explanation, risk_score, risk_level, reasons, actions
    )
    survival = compute_survival_metrics(input_dict)

    return {
        "risk_score": int(risk_score),
        "risk_level": str(risk_level),
        "reasons": reasons,
        "actions": actions,
        "llm_explanation": llm_explanation,
        "llm_explanation_ui": llm_explanation_ui,
        "survival_analysis": survival["survival_analysis"],
        "priority_action": survival["priority_action"],
    }
