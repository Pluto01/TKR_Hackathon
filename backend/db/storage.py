import os


USE_MONGODB = bool(os.getenv("MONGODB_URI", "").strip())

if USE_MONGODB:
    from .storage_mongo import (  # noqa: F401
        init_db,
        create_user,
        get_user_by_email,
        upsert_daily_checkin,
        get_user_metrics,
        get_user_checkins,
        compute_rolling_metrics,
    )
else:
    from .storage_sqlite import (  # noqa: F401
        init_db,
        create_user,
        get_user_by_email,
        upsert_daily_checkin,
        get_user_metrics,
        get_user_checkins,
        compute_rolling_metrics,
    )
