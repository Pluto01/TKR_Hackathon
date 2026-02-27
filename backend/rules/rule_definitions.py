# Rule thresholds
MAX_RECEIVABLES_RATIO = 0.35      # receivables > 35% of monthly sales
MAX_EMI_RATIO = 0.30              # loan EMI > 30% of monthly sales
MIN_CASH_BUFFER_MONTHS = 1.0      # cash should cover at least 1 month of expenses
MIN_SALES_GROWTH_RATE = -0.20     # sales decline worse than -20%
MAX_EXPENSE_GROWTH_RATE = 0.15    # expense growth above 15%


def _to_float(value, default=0.0):
    """Safely coerce numeric inputs to float for defensive rule evaluation."""
    try:
        return float(value) if value is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def high_receivables_rule(data):
    monthly_sales = _to_float(data.get("monthly_sales"))
    receivables = _to_float(data.get("receivables"))

    if monthly_sales <= 0:
        return None

    if receivables > MAX_RECEIVABLES_RATIO * monthly_sales:
        return {
            "severity": "HIGH",
            "warning": "High outstanding customer payments",
            "suggestion": "Improve collection cycle or follow up on dues",
            "feature": "receivables",
        }

    return None


def high_emi_rule(data):
    monthly_sales = _to_float(data.get("monthly_sales"))
    loan_emi = _to_float(data.get("loan_emi"))

    if monthly_sales <= 0:
        return None

    if loan_emi > MAX_EMI_RATIO * monthly_sales:
        return {
            "severity": "HIGH",
            "warning": "High EMI burden compared to revenue",
            "suggestion": "Refinance debt or reduce monthly repayment pressure",
            "feature": "loan_emi",
        }

    return None


def low_cash_buffer_rule(data):
    monthly_expenses = _to_float(data.get("monthly_expenses"))
    cash_balance = _to_float(data.get("cash_balance"))

    if monthly_expenses <= 0:
        return None

    cash_buffer_months = cash_balance / monthly_expenses

    if cash_buffer_months < MIN_CASH_BUFFER_MONTHS:
        return {
            "severity": "MEDIUM",
            "warning": "Low cash buffer to absorb expense shocks",
            "suggestion": "Build emergency liquidity to cover at least one month of expenses",
            "feature": "cash_balance",
        }

    return None


def declining_sales_momentum_rule(data):
    sales_growth_rate = _to_float(data.get("sales_growth_rate"))

    if sales_growth_rate < MIN_SALES_GROWTH_RATE:
        return {
            "severity": "MEDIUM",
            "warning": "Revenue has declined significantly in recent months",
            "suggestion": "Review pricing strategy, improve customer retention, or explore new revenue channels",
            "feature": "sales_growth_rate",
        }

    return None


def rising_expense_momentum_rule(data):
    expense_growth_rate = _to_float(data.get("expense_growth_rate"))

    if expense_growth_rate > MAX_EXPENSE_GROWTH_RATE:
        return {
            "severity": "MEDIUM",
            "warning": "Operating expenses are increasing rapidly",
            "suggestion": "Audit operational costs and reduce non-essential spending",
            "feature": "expense_growth_rate",
        }

    return None
