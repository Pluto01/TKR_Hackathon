import os
import sqlite3
from datetime import date, datetime
from typing import Dict, Optional, List


DB_PATH = os.getenv("APP_DB_PATH", "./data/app.db")


def _money(value: float) -> float:
    return round(float(value), 2)


def _ensure_db_dir() -> None:
    directory = os.path.dirname(DB_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)


def _connect() -> sqlite3.Connection:
    _ensure_db_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                checkin_date TEXT NOT NULL,
                daily_sales REAL NOT NULL,
                daily_expenses REAL NOT NULL,
                receivables REAL NOT NULL,
                loan_emi REAL NOT NULL,
                cash_balance REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, checkin_date),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_metrics (
                user_id INTEGER PRIMARY KEY,
                last_checkin_date TEXT,
                monthly_sales REAL,
                monthly_expenses REAL,
                monthly_receivables REAL,
                monthly_loan_emi REAL,
                monthly_cash_balance REAL,
                window_days INTEGER NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def create_user(name: str, email: str) -> Dict:
    now = datetime.utcnow().isoformat(timespec="seconds")
    email_value = email.strip()
    conn = _connect()
    try:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email_value,)).fetchone()
        if row:
            raise ValueError("Email already exists. Please use Existing User login.")

        cursor = conn.execute(
            "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)",
            (name.strip(), email_value, now),
        )
        conn.commit()
        return {"user_id": int(cursor.lastrowid), "name": name.strip(), "email": email_value}
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[Dict]:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE email = ?",
            (email.strip(),),
        ).fetchone()
        if not row:
            return None
        return {"user_id": int(row["id"]), "name": str(row["name"]), "email": str(row["email"])}
    finally:
        conn.close()


def _validate_user_exists(conn: sqlite3.Connection, user_id: int) -> None:
    row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise ValueError(f"User {user_id} not found")


def _recompute_metrics(conn: sqlite3.Connection, user_id: int, as_of_date: str) -> Dict:
    agg = conn.execute(
        """
        SELECT
            AVG(daily_sales) AS avg_daily_sales,
            AVG(daily_expenses) AS avg_daily_expenses,
            AVG(receivables) AS avg_receivables,
            AVG(loan_emi) AS avg_loan_emi,
            AVG(cash_balance) AS avg_cash_balance,
            COUNT(*) AS cnt
        FROM daily_checkins
        WHERE user_id = ?
          AND checkin_date BETWEEN date(?, '-29 day') AND date(?)
        """,
        (user_id, as_of_date, as_of_date),
    ).fetchone()

    avg_daily_sales = float(agg["avg_daily_sales"] or 0.0)
    avg_daily_expenses = float(agg["avg_daily_expenses"] or 0.0)
    avg_receivables = float(agg["avg_receivables"] or 0.0)
    avg_loan_emi = float(agg["avg_loan_emi"] or 0.0)
    avg_cash_balance = float(agg["avg_cash_balance"] or 0.0)
    window_days = int(agg["cnt"] or 0)
    updated_at = datetime.utcnow().isoformat(timespec="seconds")

    monthly_sales = avg_daily_sales * 30.0
    monthly_expenses = avg_daily_expenses * 30.0
    monthly_receivables = avg_receivables * 30.0
    monthly_loan_emi = avg_loan_emi * 30.0
    monthly_cash_balance = avg_cash_balance * 30.0

    conn.execute(
        """
        INSERT INTO user_metrics (
            user_id, last_checkin_date, monthly_sales, monthly_expenses,
            monthly_receivables, monthly_loan_emi, monthly_cash_balance,
            window_days, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            last_checkin_date = excluded.last_checkin_date,
            monthly_sales = excluded.monthly_sales,
            monthly_expenses = excluded.monthly_expenses,
            monthly_receivables = excluded.monthly_receivables,
            monthly_loan_emi = excluded.monthly_loan_emi,
            monthly_cash_balance = excluded.monthly_cash_balance,
            window_days = excluded.window_days,
            updated_at = excluded.updated_at
        """,
        (
            user_id,
            as_of_date,
            monthly_sales,
            monthly_expenses,
            monthly_receivables,
            monthly_loan_emi,
            monthly_cash_balance,
            window_days,
            updated_at,
        ),
    )

    return {
        "user_id": user_id,
        "checkin_date": as_of_date,
        "monthly_sales": _money(monthly_sales),
        "monthly_expenses": _money(monthly_expenses),
        "monthly_receivables": _money(monthly_receivables),
        "monthly_loan_emi": _money(monthly_loan_emi),
        "monthly_cash_balance": _money(monthly_cash_balance),
        "window_days": window_days,
    }


def upsert_daily_checkin(payload: Dict) -> Dict:
    user_id = int(payload["user_id"])
    checkin_date = (payload.get("checkin_date") or date.today().isoformat()).strip()
    now = datetime.utcnow().isoformat(timespec="seconds")

    conn = _connect()
    try:
        _validate_user_exists(conn, user_id)

        existing = conn.execute(
            "SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?",
            (user_id, checkin_date),
        ).fetchone()

        conn.execute(
            """
            INSERT INTO daily_checkins (
                user_id, checkin_date, daily_sales, daily_expenses,
                receivables, loan_emi, cash_balance, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, checkin_date) DO UPDATE SET
                daily_sales = excluded.daily_sales,
                daily_expenses = excluded.daily_expenses,
                receivables = excluded.receivables,
                loan_emi = excluded.loan_emi,
                cash_balance = excluded.cash_balance,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                checkin_date,
                float(payload["daily_sales"]),
                float(payload["daily_expenses"]),
                float(payload["receivables"]),
                float(payload["loan_emi"]),
                float(payload["cash_balance"]),
                now,
                now,
            ),
        )

        metrics = _recompute_metrics(conn, user_id=user_id, as_of_date=checkin_date)
        conn.commit()
        metrics["updated"] = bool(existing)
        return metrics
    finally:
        conn.close()


def get_user_metrics(user_id: int) -> Optional[Dict]:
    conn = _connect()
    try:
        row = conn.execute(
            """
            SELECT
                user_id, last_checkin_date, monthly_sales, monthly_expenses,
                monthly_receivables, monthly_loan_emi, monthly_cash_balance
            FROM user_metrics
            WHERE user_id = ?
            """,
            (int(user_id),),
        ).fetchone()
        if not row:
            return None
        return {
            "user_id": int(row["user_id"]),
            "last_checkin_date": row["last_checkin_date"],
            "monthly_sales": _money(row["monthly_sales"]) if row["monthly_sales"] is not None else None,
            "monthly_expenses": _money(row["monthly_expenses"]) if row["monthly_expenses"] is not None else None,
            "monthly_receivables": _money(row["monthly_receivables"]) if row["monthly_receivables"] is not None else None,
            "monthly_loan_emi": _money(row["monthly_loan_emi"]) if row["monthly_loan_emi"] is not None else None,
            "monthly_cash_balance": _money(row["monthly_cash_balance"]) if row["monthly_cash_balance"] is not None else None,
        }
    finally:
        conn.close()


def get_user_checkins(user_id: int, limit: int = 120) -> List[Dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            """
            SELECT checkin_date, daily_sales, daily_expenses
            FROM daily_checkins
            WHERE user_id = ?
            ORDER BY checkin_date ASC
            LIMIT ?
            """,
            (int(user_id), int(limit)),
        ).fetchall()
        return [
            {
                "checkin_date": str(row["checkin_date"]),
                "daily_sales": _money(row["daily_sales"]),
                "daily_expenses": _money(row["daily_expenses"]),
            }
            for row in rows
        ]
    finally:
        conn.close()


def compute_rolling_metrics(user_id: int, as_of_date: Optional[str] = None) -> Dict:
    """
    Compute rolling and previous 30-day aggregates from daily_checkins.

    Returns:
      {
        "monthly_sales": float,
        "monthly_expenses": float,
        "sales_3_months_ago": float,
        "expenses_3_months_ago": float,
      }
    """
    anchor_date = (as_of_date or date.today().isoformat()).strip()
    conn = _connect()
    try:
        _validate_user_exists(conn, int(user_id))

        current = conn.execute(
            """
            SELECT
              SUM(daily_sales) AS rolling_sales,
              SUM(daily_expenses) AS rolling_expenses
            FROM daily_checkins
            WHERE user_id = ?
              AND checkin_date BETWEEN date(?, '-29 day') AND date(?)
            """,
            (int(user_id), anchor_date, anchor_date),
        ).fetchone()

        previous = conn.execute(
            """
            SELECT
              SUM(daily_sales) AS prev_sales,
              SUM(daily_expenses) AS prev_expenses
            FROM daily_checkins
            WHERE user_id = ?
              AND checkin_date BETWEEN date(?, '-59 day') AND date(?, '-30 day')
            """,
            (int(user_id), anchor_date, anchor_date),
        ).fetchone()

        rolling_30_day_sales = float(current["rolling_sales"] or 0.0)
        rolling_30_day_expenses = float(current["rolling_expenses"] or 0.0)
        previous_30_day_sales = float(previous["prev_sales"] or 0.0)
        previous_30_day_expenses = float(previous["prev_expenses"] or 0.0)

        return {
            "monthly_sales": _money(rolling_30_day_sales),
            "monthly_expenses": _money(rolling_30_day_expenses),
            "sales_3_months_ago": _money(previous_30_day_sales),
            "expenses_3_months_ago": _money(previous_30_day_expenses),
        }
    finally:
        conn.close()
