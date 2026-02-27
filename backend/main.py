from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas.request_response import (
    InputData,
    CheckInputResponse,
    PredictResponse,
)

from rules.rule_engine import evaluate_rules
from utils.feature_engineering import compute_features
from ml.predictor import predict_risk


app = FastAPI(
    title="MSME Financial Risk Intelligence API",
    version="1.0",
)

# Allow Expo (mobile + web) to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/predict", response_model=PredictResponse)
def predict(data: InputData):
    input_dict = data.dict()

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
        return {
            "risk_score": 0,
            "risk_level": "INSUFFICIENT DATA",
            "reasons": [f"Missing required inputs: {missing_str}"],
            "actions": ["Please fill all fields to analyze financial risk"],
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

    # Use rule engine outputs directly for explainability.
    warnings, suggestions = evaluate_rules(input_dict)
    reasons = [str(w) for w in warnings]
    actions = [str(s) for s in suggestions]

    return {
        "risk_score": int(risk_score),
        "risk_level": str(risk_level),
        "reasons": reasons,
        "actions": actions,
    }
