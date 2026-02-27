from pydantic import BaseModel
from typing import List, Optional


class InputData(BaseModel):
    user_id: Optional[int] = None
    use_daily_mode: Optional[bool] = None
    as_of_date: Optional[str] = None  # YYYY-MM-DD (optional reference date for rolling windows)
    monthly_sales: Optional[float] = None
    monthly_expenses: Optional[float] = None
    receivables: Optional[float] = None
    loan_emi: Optional[float] = None
    cash_balance: Optional[float] = None
    sales_3_months_ago: Optional[float] = None
    expenses_3_months_ago: Optional[float] = None


class CheckInputResponse(BaseModel):
    warnings: List[str]
    suggestions: List[str]


class LLMExplanationUI(BaseModel):
    summary: str
    key_drivers: List[str]
    immediate_actions: List[str]


class SurvivalAnalysis(BaseModel):
    cash_runway_months: float
    estimated_days_left: float
    monthly_loss: float
    break_even_sales_required: float


class PriorityAction(BaseModel):
    top_fix: str
    target_amount: float
    expected_impact: str


class PredictResponse(BaseModel):
    risk_score: int
    risk_level: str
    reasons: List[str]
    actions: List[str]
    llm_explanation: Optional[str] = None
    llm_explanation_ui: LLMExplanationUI
    survival_analysis: Optional[SurvivalAnalysis] = None
    priority_action: Optional[PriorityAction] = None


class UserRegisterRequest(BaseModel):
    name: str
    email: str


class UserRegisterResponse(BaseModel):
    user_id: int
    name: str
    email: str


class UserLoginRequest(BaseModel):
    email: str


class DailyCheckinRequest(BaseModel):
    user_id: int
    checkin_date: Optional[str] = None  # YYYY-MM-DD; defaults to today in backend
    daily_sales: float
    daily_expenses: float
    receivables: float
    loan_emi: float
    cash_balance: float


class DailyCheckinResponse(BaseModel):
    user_id: int
    checkin_date: str
    monthly_sales: float
    monthly_expenses: float
    monthly_receivables: float
    monthly_loan_emi: float
    monthly_cash_balance: float
    window_days: int
    updated: bool


class UserMetricsResponse(BaseModel):
    user_id: int
    last_checkin_date: Optional[str] = None
    monthly_sales: Optional[float] = None
    monthly_expenses: Optional[float] = None
    monthly_receivables: Optional[float] = None
    monthly_loan_emi: Optional[float] = None
    monthly_cash_balance: Optional[float] = None


class DailyCheckinRecord(BaseModel):
    checkin_date: str
    daily_sales: float
    daily_expenses: float
