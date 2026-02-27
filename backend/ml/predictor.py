import os
import pickle

# Load model once at import time and fail loudly on invalid model artifact.
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

if os.path.getsize(MODEL_PATH) == 0:
    raise RuntimeError(f"Model file is empty: {MODEL_PATH}")

with open(MODEL_PATH, "rb") as f:
    try:
        model = pickle.load(f)
    except Exception as exc:
        raise RuntimeError(f"Failed to load model from {MODEL_PATH}") from exc

if not hasattr(model, "predict_proba"):
    raise TypeError("Loaded model does not implement predict_proba")


def predict_risk(features: dict) -> float:
    """
    Predict probability of financial distress.
    Returns value between 0 and 1.
    """
    feature_vector = [
        features["profit_margin"],
        features["receivables_ratio"],
        features["emi_ratio"],
        features["cash_buffer_months"],
    ]

    probability = model.predict_proba([feature_vector])[0][1]
    return float(probability)
