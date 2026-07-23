from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.database import engine, Base
from app.routers import auth, tasks, dashboard, tags, time_tracking, templates
from app.config import settings
from collections import defaultdict
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ToDoApp API", version="1.0.0")


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": [
                {
                    "field": " -> ".join(str(loc) for loc in err["loc"]),
                    "message": err["msg"],
                    "type": err["type"]
                }
                for err in exc.errors()
            ]
        }
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database integrity error: {exc.orig}")
    return JSONResponse(
        status_code=409,
        content={"detail": "Database integrity error. This may be caused by duplicate or conflicting data."}
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred. Please try again later."}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

# CORS - use env var for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
rate_limit_store = defaultdict(list)
RATE_LIMIT = 100  # requests per minute
RATE_WINDOW = 60  # seconds


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health check
    if request.url.path == "/":
        return await call_next(request)
    
    client_ip = request.client.host
    now = time.time()
    
    # Clean old entries
    rate_limit_store[client_ip] = [
        t for t in rate_limit_store[client_ip] if now - t < RATE_WINDOW
    ]
    
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too many requests. Please try again later.",
                "retry_after": RATE_WINDOW
            }
        )
    
    rate_limit_store[client_ip].append(now)
    response = await call_next(request)
    return response


# HTTPS redirect middleware (only in production)
@app.middleware("http")
async def https_redirect_middleware(request: Request, call_next):
    if settings.FORCE_HTTPS and request.headers.get("x-forwarded-proto") == "http":
        url = request.url.replace(scheme="https")
        return JSONResponse(
            status_code=307,
            headers={"Location": str(url)}
        )
    return await call_next(request)


app.include_router(auth.router)
app.include_router(time_tracking.router)
app.include_router(tasks.router)
app.include_router(tags.router)
app.include_router(templates.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "ToDoApp API"}
