import os
import random

import pandas as pd


SEED = 42
NUM_SAMPLES = 5000

random.seed(SEED)


def _clip(value, low, high):
    return max(low, min(high, value))


rows = []

for _ in range(NUM_SAMPLES):
    # Right-skewed sales distribution is more realistic for MSMEs.
    monthly_sales = int(_clip(random.lognormvariate(12.5, 0.6), 50_000, 1_200_000))

    # Better businesses typically sustain lower expense ratios.
    expense_ratio = _clip(random.normalvariate(0.78, 0.10), 0.50, 0.97)
    monthly_expenses = int(monthly_sales * expense_ratio)

    # Ratios sampled from bounded distributions to avoid uniform-random artifacts.
    receivables_ratio = _clip(random.betavariate(2.0, 5.0), 0.0, 0.65)
    emi_ratio = _clip(random.betavariate(1.6, 6.0), 0.0, 0.45)

    receivables = int(monthly_sales * receivables_ratio)
    loan_emi = int(monthly_sales * emi_ratio)

    cash_buffer_months = _clip(random.lognormvariate(-0.15, 0.60), 0.10, 6.0)
    cash_balance = int(monthly_expenses * cash_buffer_months)

    profit_margin = (monthly_sales - monthly_expenses) / monthly_sales
    receivables_ratio = receivables / monthly_sales
    emi_ratio = loan_emi / monthly_sales
    cash_buffer_months = cash_balance / max(monthly_expenses, 1)

    # Soft score + noise produces non-brittle labels.
    risk_score = (
        2.2 * max(0.0, receivables_ratio - 0.30)
        + 2.4 * max(0.0, emi_ratio - 0.22)
        + 1.7 * max(0.0, 1.0 - cash_buffer_months)
        + 1.6 * max(0.0, 0.10 - profit_margin)
        + random.normalvariate(0.0, 0.08)
    )

    distress = 1 if risk_score > 0.35 else 0

    rows.append(
        [
            profit_margin,
            receivables_ratio,
            emi_ratio,
            cash_buffer_months,
            distress,
        ]
    )

df = pd.DataFrame(
    rows,
    columns=[
        "profit_margin",
        "receivables_ratio",
        "emi_ratio",
        "cash_buffer_months",
        "distress",
    ],
)

file_path = os.path.join(os.path.dirname(__file__), "synthetic_msme.csv")
df.to_csv(file_path, index=False)

positive_rate = float(df["distress"].mean())
print("Synthetic MSME dataset generated successfully")
print(f"Saved at: {file_path}")
print(f"Rows: {len(df)}")
print(f"Distress rate: {positive_rate:.3f}")
