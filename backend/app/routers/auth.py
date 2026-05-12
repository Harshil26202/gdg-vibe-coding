from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


async def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await auth_service.get_current_user(credentials.credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await auth_service.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        username=body.username,
        email=body.email,
        password_hash=auth_service.hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = auth_service.create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth_service.create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user_dep)):
    return current_user
