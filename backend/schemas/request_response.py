from pydantic import BaseModel
from typing import List, Optional


class InputData(BaseModel):
    monthly_sales: Optional[float] = None
    monthly_expenses: Optional[float] = None
    receivables: Optional[float] = None
    loan_emi: Optional[float] = None
    cash_balance: Optional[float] = None


class CheckInputResponse(BaseModel):
    warnings: List[str]
    suggestions: List[str]


class PredictResponse(BaseModel):
    risk_score: int
    risk_level: str
    reasons: List[str]
    actions: List[str]