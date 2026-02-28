import os
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from pymongo import ASCENDING, MongoClient, ReturnDocument


MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "finpilot").strip()

_client: Optional[MongoClient] = None


def _money(value: float) -> float:
    return round(float(value), 2)


def _require_uri() -> str:
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not set")
    return MONGODB_URI


def _get_db():
    global _client
    if _client is None:
        _client = MongoClient(_require_uri())
    return _client[MONGODB_DB_NAME]


def init_db() -> None:
    db = _get_db()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.users.create_index([("user_id", ASCENDING)], unique=True)
    db.daily_checkins.create_index(
        [("user_id", ASCENDING), ("checkin_date", ASCENDING)],
        unique=True,
    )
    db.user_metrics.create_index([("user_id", ASCENDING)], unique=True)
    db.counters.update_one(
        {"_id": "user_id"},
        {"$setOnInsert": {"seq": 0}},
        upsert=True,
    )


def _next_user_id(db) -> int:
    doc = db.counters.find_one_and_update(
        {"_id": "user_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["seq"])


def create_user(name: str, email: str) -> Dict:
    db = _get_db()
    email_value = email.strip()
    if db.users.find_one({"email": email_value}, {"_id": 1}):
        raise ValueError("Email already exists. Please use Existing User login.")

    user_id = _next_user_id(db)
    now = datetime.utcnow().isoformat(timespec="seconds")
    doc = {
        "user_id": user_id,
        "name": name.strip(),
        "email": email_value,
        "created_at": now,
    }
    db.users.insert_one(doc)
    return {"user_id": user_id, "name": doc["name"], "email": doc["email"]}


def get_user_by_email(email: str) -> Optional[Dict]:
    db = _get_db()
    row = db.users.find_one(
        {"email": email.strip()},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    )
    if not row:
        return None
    return {"user_id": int(row["user_id"]), "name": str(row["name"]), "email": str(row["email"])}


def _validate_user_exists(db, user_id: int) -> None:
    if not db.users.find_one({"user_id": int(user_id)}, {"_id": 1}):
        raise ValueError(f"User {user_id} not found")


def _sum_and_avg(db, user_id: int, start_date: str, end_date: str) -> Dict:
    pipeline = [
        {
            "$match": {
                "user_id": int(user_id),
                "checkin_date": {"$gte": start_date, "$lte": end_date},
            }
        },
        {
            "$group": {
                "_id": None,
                "avg_daily_sales": {"$avg": "$daily_sales"},
                "avg_daily_expenses": {"$avg": "$daily_expenses"},
                "avg_receivables": {"$avg": "$receivables"},
                "avg_loan_emi": {"$avg": "$loan_emi"},
                "avg_cash_balance": {"$avg": "$cash_balance"},
                "sum_sales": {"$sum": "$daily_sales"},
                "sum_expenses": {"$sum": "$daily_expenses"},
                "count": {"$sum": 1},
            }
        },
    ]
    rows = list(db.daily_checkins.aggregate(pipeline))
    return rows[0] if rows else {}


def _recompute_metrics(db, user_id: int, as_of_date: str) -> Dict:
    anchor = datetime.strptime(as_of_date, "%Y-%m-%d").date()
    start = (anchor - timedelta(days=29)).isoformat()
    agg = _sum_and_avg(db, user_id=int(user_id), start_date=start, end_date=as_of_date)

    avg_daily_sales = float(agg.get("avg_daily_sales") or 0.0)
    avg_daily_expenses = float(agg.get("avg_daily_expenses") or 0.0)
    avg_receivables = float(agg.get("avg_receivables") or 0.0)
    avg_loan_emi = float(agg.get("avg_loan_emi") or 0.0)
    avg_cash_balance = float(agg.get("avg_cash_balance") or 0.0)
    window_days = int(agg.get("count") or 0)

    monthly_sales = avg_daily_sales * 30.0
    monthly_expenses = avg_daily_expenses * 30.0
    monthly_receivables = avg_receivables * 30.0
    monthly_loan_emi = avg_loan_emi * 30.0
    monthly_cash_balance = avg_cash_balance * 30.0
    updated_at = datetime.utcnow().isoformat(timespec="seconds")

    metrics_doc = {
        "user_id": int(user_id),
        "last_checkin_date": as_of_date,
        "monthly_sales": monthly_sales,
        "monthly_expenses": monthly_expenses,
        "monthly_receivables": monthly_receivables,
        "monthly_loan_emi": monthly_loan_emi,
        "monthly_cash_balance": monthly_cash_balance,
        "window_days": window_days,
        "updated_at": updated_at,
    }
    db.user_metrics.update_one({"user_id": int(user_id)}, {"$set": metrics_doc}, upsert=True)

    return {
        "user_id": int(user_id),
        "checkin_date": as_of_date,
        "monthly_sales": _money(monthly_sales),
        "monthly_expenses": _money(monthly_expenses),
        "monthly_receivables": _money(monthly_receivables),
        "monthly_loan_emi": _money(monthly_loan_emi),
        "monthly_cash_balance": _money(monthly_cash_balance),
        "window_days": window_days,
    }


def upsert_daily_checkin(payload: Dict) -> Dict:
    db = _get_db()
    user_id = int(payload["user_id"])
    checkin_date = (payload.get("checkin_date") or date.today().isoformat()).strip()
    now = datetime.utcnow().isoformat(timespec="seconds")

    _validate_user_exists(db, user_id)
    existing = db.daily_checkins.find_one({"user_id": user_id, "checkin_date": checkin_date}, {"_id": 1})

    db.daily_checkins.update_one(
        {"user_id": user_id, "checkin_date": checkin_date},
        {
            "$set": {
                "daily_sales": float(payload["daily_sales"]),
                "daily_expenses": float(payload["daily_expenses"]),
                "receivables": float(payload["receivables"]),
                "loan_emi": float(payload["loan_emi"]),
                "cash_balance": float(payload["cash_balance"]),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    metrics = _recompute_metrics(db, user_id=user_id, as_of_date=checkin_date)
    metrics["updated"] = bool(existing)
    return metrics


def get_user_metrics(user_id: int) -> Optional[Dict]:
    db = _get_db()
    row = db.user_metrics.find_one({"user_id": int(user_id)}, {"_id": 0})
    if not row:
        return None
    return {
        "user_id": int(row["user_id"]),
        "last_checkin_date": row.get("last_checkin_date"),
        "monthly_sales": _money(row["monthly_sales"]) if row.get("monthly_sales") is not None else None,
        "monthly_expenses": _money(row["monthly_expenses"]) if row.get("monthly_expenses") is not None else None,
        "monthly_receivables": _money(row["monthly_receivables"]) if row.get("monthly_receivables") is not None else None,
        "monthly_loan_emi": _money(row["monthly_loan_emi"]) if row.get("monthly_loan_emi") is not None else None,
        "monthly_cash_balance": _money(row["monthly_cash_balance"]) if row.get("monthly_cash_balance") is not None else None,
    }


def get_user_checkins(user_id: int, limit: int = 120) -> List[Dict]:
    db = _get_db()
    rows = (
        db.daily_checkins.find(
            {"user_id": int(user_id)},
            {"_id": 0, "checkin_date": 1, "daily_sales": 1, "daily_expenses": 1},
        )
        .sort("checkin_date", ASCENDING)
        .limit(int(limit))
    )
    return [
        {
            "checkin_date": str(row["checkin_date"]),
            "daily_sales": _money(row["daily_sales"]),
            "daily_expenses": _money(row["daily_expenses"]),
        }
        for row in rows
    ]


def compute_rolling_metrics(user_id: int, as_of_date: Optional[str] = None) -> Dict:
    db = _get_db()
    _validate_user_exists(db, int(user_id))

    anchor = datetime.strptime((as_of_date or date.today().isoformat()).strip(), "%Y-%m-%d").date()
    cur_start = (anchor - timedelta(days=29)).isoformat()
    cur_end = anchor.isoformat()
    prev_start = (anchor - timedelta(days=59)).isoformat()
    prev_end = (anchor - timedelta(days=30)).isoformat()

    cur = _sum_and_avg(db, user_id=int(user_id), start_date=cur_start, end_date=cur_end)
    prev = _sum_and_avg(db, user_id=int(user_id), start_date=prev_start, end_date=prev_end)

    rolling_30_day_sales = float(cur.get("sum_sales") or 0.0)
    rolling_30_day_expenses = float(cur.get("sum_expenses") or 0.0)
    previous_30_day_sales = float(prev.get("sum_sales") or 0.0)
    previous_30_day_expenses = float(prev.get("sum_expenses") or 0.0)

    return {
        "monthly_sales": _money(rolling_30_day_sales),
        "monthly_expenses": _money(rolling_30_day_expenses),
        "sales_3_months_ago": _money(previous_30_day_sales),
        "expenses_3_months_ago": _money(previous_30_day_expenses),
    }
