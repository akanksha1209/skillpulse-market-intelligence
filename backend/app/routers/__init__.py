from . import intelligence, market, planning  # noqa: F401

API_ROUTERS = [
    (market.router, "/api"),
    (intelligence.router, "/api"),
    (planning.router, "/api"),
]
