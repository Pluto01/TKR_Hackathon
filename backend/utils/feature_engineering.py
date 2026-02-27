def _to_float(value, default=0.0):
    """Convert nullable numeric input to float safely."""
    try:
        return float(value) if value is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def _safe_div(numerator, denominator, default=0.0):
    """Division helper that prevents ZeroDivisionError and invalid numeric states."""
    if denominator == 0:
        return float(default)
    return float(numerator) / float(denominator)


def compute_features(data):
    # Defensive extraction so this function is safe for partial/dirty payloads.
    monthly_sales = _to_float(data.get("monthly_sales"))
    monthly_expenses = _to_float(data.get("monthly_expenses"))
    receivables = _to_float(data.get("receivables"))
    loan_emi = _to_float(data.get("loan_emi"))
    cash_balance = _to_float(data.get("cash_balance"))
    sales_3_months_ago = _to_float(data.get("sales_3_months_ago"))
    expenses_3_months_ago = _to_float(data.get("expenses_3_months_ago"))

    return {
        "profit_margin": _safe_div(monthly_sales - monthly_expenses, monthly_sales),
        "receivables_ratio": _safe_div(receivables, monthly_sales),
        "emi_ratio": _safe_div(loan_emi, monthly_sales),
        "cash_buffer_months": _safe_div(cash_balance, monthly_expenses),
        "sales_growth_rate": _safe_div(monthly_sales - sales_3_months_ago, sales_3_months_ago),
        "expense_growth_rate": _safe_div(monthly_expenses - expenses_3_months_ago, expenses_3_months_ago),
    }
