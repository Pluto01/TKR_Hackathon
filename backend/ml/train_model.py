import os
import pickle

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split


def best_f1_threshold(y_true, probabilities):
    best_threshold = 0.5
    best_f1 = -1.0

    for threshold in np.arange(0.20, 0.81, 0.01):
        y_pred = (probabilities >= threshold).astype(int)
        current_f1 = f1_score(y_true, y_pred, zero_division=0)
        if current_f1 > best_f1:
            best_f1 = current_f1
            best_threshold = float(threshold)

    return best_threshold, best_f1


# Load synthetic dataset
DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/synthetic_msme.csv")
df = pd.read_csv(DATA_PATH)

# Features and label
X = df[["profit_margin", "receivables_ratio", "emi_ratio", "cash_buffer_months"]]
y = df["distress"]

# Split into train/validation/test:
# - validation is for model/threshold selection
# - test is for final unbiased reporting
X_train_full, X_test, y_train_full, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
X_train, X_val, y_train, y_val = train_test_split(
    X_train_full, y_train_full, test_size=0.25, random_state=42, stratify=y_train_full
)

candidate_models = {
    "logreg_balanced": LogisticRegression(max_iter=2000, class_weight="balanced"),
    "random_forest": RandomForestClassifier(
        n_estimators=400,
        random_state=42,
        class_weight="balanced",
        min_samples_leaf=3,
    ),
    "gradient_boosting": GradientBoostingClassifier(random_state=42),
}

best_name = None
best_model = None
best_threshold = 0.5
best_val_auc = -1.0
best_val_f1 = -1.0

print("Validation performance by candidate model:")
for model_name, model in candidate_models.items():
    model.fit(X_train, y_train)
    val_prob = model.predict_proba(X_val)[:, 1]
    val_auc = roc_auc_score(y_val, val_prob)
    threshold, val_f1 = best_f1_threshold(y_val, val_prob)

    print(
        f"- {model_name}: val_roc_auc={val_auc:.4f}, "
        f"best_threshold={threshold:.2f}, val_f1={val_f1:.4f}"
    )

    is_better = (val_auc > best_val_auc) or (
        abs(val_auc - best_val_auc) < 1e-9 and val_f1 > best_val_f1
    )
    if is_better:
        best_name = model_name
        best_model = model
        best_threshold = threshold
        best_val_auc = val_auc
        best_val_f1 = val_f1

# Refit selected model on full training data (train + validation)
best_model.fit(X_train_full, y_train_full)

# Evaluate on final holdout test set using selected threshold
y_prob = best_model.predict_proba(X_test)[:, 1]
y_pred = (y_prob >= best_threshold).astype(int)

# Save best model artifact for inference
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
with open(MODEL_PATH, "wb") as f:
    pickle.dump(best_model, f)

print()
print(f"Selected model: {best_name}")
print(f"Decision threshold: {best_threshold:.2f}")
print("Model trained and saved successfully")
print("Evaluation on holdout test split:")
print(f"Rows:      {len(df)}")
print(f"Train/Test {len(X_train_full)}/{len(X_test)}")
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred, zero_division=0):.4f}")
print(f"F1 score:  {f1_score(y_test, y_pred, zero_division=0):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")
print("Confusion matrix:")
print(confusion_matrix(y_test, y_pred))
print("Classification report:")
print(classification_report(y_test, y_pred, digits=4, zero_division=0))
