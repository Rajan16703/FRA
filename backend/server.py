from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="FRA-Connect API", description="Forest Rights Atlas & Decision Support System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class ClaimStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONTESTED = "contested"
    UNDER_REVIEW = "under_review"

class ClaimType(str, Enum):
    IFR = "Individual Forest Rights"
    CFR = "Community Forest Rights"
    CR = "Community Rights"

class UserRole(str, Enum):
    ADMIN = "admin"
    DISTRICT_OFFICER = "district_officer"
    FIELD_OFFICER = "field_officer"
    VERIFIER = "verifier"
    VIEWER = "viewer"

# Models
class Village(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    state: str
    district: str
    tehsil: str
    coordinates: Dict[str, float]  # lat, lng
    total_forest_area: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ForestRightsClaim(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    claim_number: str
    beneficiary_name: str
    village_id: str
    claim_type: ClaimType
    status: ClaimStatus
    area_claimed: float
    survey_numbers: List[str]
    documents: List[str] = []
    ocr_confidence: float = 0.0
    ai_recommendation: str = "pending_analysis"
    ai_confidence: float = 0.0
    assigned_officer: Optional[str] = None
    linked_schemes: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: UserRole
    district: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OCRDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    extracted_text: str
    confidence_score: float
    claim_id: str
    processed_at: datetime = Field(default_factory=datetime.utcnow)

class Analytics(BaseModel):
    total_villages: int
    total_claims: int
    pending_claims: int
    approved_claims: int
    rejected_claims: int
    average_processing_time: float
    ocr_accuracy: float
    scheme_integration_count: int

# Create models for requests
class ClaimCreate(BaseModel):
    beneficiary_name: str
    village_id: str
    claim_type: ClaimType
    area_claimed: float
    survey_numbers: List[str]

class ClaimUpdate(BaseModel):
    status: Optional[ClaimStatus] = None
    assigned_officer: Optional[str] = None
    linked_schemes: Optional[List[str]] = None

# Routes

@api_router.get("/")
async def root():
    return {"message": "FRA-Connect API - Forest Rights Atlas & Decision Support System"}

# Village routes
@api_router.get("/villages", response_model=List[Village])
async def get_villages(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """Get list of villages with optional filtering"""
    filter_dict = {}
    if state:
        filter_dict["state"] = state
    if district:
        filter_dict["district"] = district
    
    villages = await db.villages.find(filter_dict).limit(limit).to_list(length=None)
    return [Village(**village) for village in villages]

@api_router.get("/villages/{village_id}", response_model=Village)
async def get_village(village_id: str):
    """Get specific village details"""
    village = await db.villages.find_one({"id": village_id})
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")
    return Village(**village)

@api_router.post("/villages", response_model=Village)
async def create_village(village: Village):
    """Create a new village"""
    village_dict = village.dict()
    await db.villages.insert_one(village_dict)
    return village

# Claims routes
@api_router.get("/claims", response_model=List[ForestRightsClaim])
async def get_claims(
    status: Optional[ClaimStatus] = Query(None),
    village_id: Optional[str] = Query(None),
    assigned_officer: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """Get forest rights claims with filtering"""
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    if village_id:
        filter_dict["village_id"] = village_id
    if assigned_officer:
        filter_dict["assigned_officer"] = assigned_officer
    
    claims = await db.claims.find(filter_dict).limit(limit).to_list(length=None)
    return [ForestRightsClaim(**claim) for claim in claims]

@api_router.get("/claims/{claim_id}", response_model=ForestRightsClaim)
async def get_claim(claim_id: str):
    """Get specific claim details"""
    claim = await db.claims.find_one({"id": claim_id})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return ForestRightsClaim(**claim)

@api_router.post("/claims", response_model=ForestRightsClaim)
async def create_claim(claim_data: ClaimCreate):
    """Create a new forest rights claim"""
    # Generate claim number
    claim_count = await db.claims.count_documents({})
    claim_number = f"FRA-{datetime.now().year}-{claim_count + 1:06d}"
    
    # Mock AI recommendation
    ai_recommendation = "approve" if claim_data.area_claimed < 4.0 else "review"
    ai_confidence = 0.85 if claim_data.area_claimed < 4.0 else 0.65
    
    claim = ForestRightsClaim(
        claim_number=claim_number,
        beneficiary_name=claim_data.beneficiary_name,
        village_id=claim_data.village_id,
        claim_type=claim_data.claim_type,
        area_claimed=claim_data.area_claimed,
        survey_numbers=claim_data.survey_numbers,
        status=ClaimStatus.PENDING,
        ai_recommendation=ai_recommendation,
        ai_confidence=ai_confidence,
        ocr_confidence=0.92  # Mock OCR confidence
    )
    
    claim_dict = claim.dict()
    await db.claims.insert_one(claim_dict)
    return claim

@api_router.put("/claims/{claim_id}", response_model=ForestRightsClaim)
async def update_claim(claim_id: str, update_data: ClaimUpdate):
    """Update claim status and details"""
    claim = await db.claims.find_one({"id": claim_id})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.claims.update_one({"id": claim_id}, {"$set": update_dict})
    
    updated_claim = await db.claims.find_one({"id": claim_id})
    return ForestRightsClaim(**updated_claim)

# Analytics routes
@api_router.get("/analytics", response_model=Analytics)
async def get_analytics():
    """Get dashboard analytics"""
    total_villages = await db.villages.count_documents({})
    total_claims = await db.claims.count_documents({})
    pending_claims = await db.claims.count_documents({"status": "pending"})
    approved_claims = await db.claims.count_documents({"status": "approved"})
    rejected_claims = await db.claims.count_documents({"status": "rejected"})
    
    return Analytics(
        total_villages=total_villages,
        total_claims=total_claims,
        pending_claims=pending_claims,
        approved_claims=approved_claims,
        rejected_claims=rejected_claims,
        average_processing_time=15.5,  # Mock data
        ocr_accuracy=0.92,  # Mock data
        scheme_integration_count=150  # Mock data
    )

# Mock data generation routes
@api_router.post("/mock-data/generate")
async def generate_mock_data():
    """Generate mock data for testing"""
    # Create mock villages
    mock_villages = [
        Village(name="Rampur", state="Madhya Pradesh", district="Balaghat", tehsil="Balaghat", 
                coordinates={"lat": 21.8047, "lng": 80.1847}, total_forest_area=450.5),
        Village(name="Sundarpur", state="Madhya Pradesh", district="Balaghat", tehsil="Kirnapur", 
                coordinates={"lat": 21.9047, "lng": 80.2847}, total_forest_area=320.8),
        Village(name="Vanagram", state="Chhattisgarh", district="Korba", tehsil="Korba", 
                coordinates={"lat": 22.3511, "lng": 82.6897}, total_forest_area=280.3),
        Village(name="Forestpur", state="Chhattisgarh", district="Korba", tehsil="Pali", 
                coordinates={"lat": 22.4511, "lng": 82.7897}, total_forest_area=410.7),
        Village(name="Tribalnagar", state="Jharkhand", district="Ranchi", tehsil="Bundu", 
                coordinates={"lat": 23.3441, "lng": 85.3096}, total_forest_area=375.2)
    ]
    
    for village in mock_villages:
        existing = await db.villages.find_one({"name": village.name, "district": village.district})
        if not existing:
            await db.villages.insert_one(village.dict())
    
    # Create mock claims
    villages = await db.villages.find().to_list(length=None)
    if villages:
        mock_claims = []
        for i, village in enumerate(villages[:3]):
            claim = ForestRightsClaim(
                claim_number=f"FRA-2024-{i+1:06d}",
                beneficiary_name=f"Beneficiary {i+1}",
                village_id=village["id"],
                claim_type=ClaimType.IFR if i % 2 == 0 else ClaimType.CFR,
                status=ClaimStatus.PENDING if i == 0 else (ClaimStatus.APPROVED if i == 1 else ClaimStatus.UNDER_REVIEW),
                area_claimed=2.5 + i * 0.8,
                survey_numbers=[f"Survey{i+1}/1", f"Survey{i+1}/2"],
                ocr_confidence=0.85 + i * 0.05,
                ai_recommendation="approve" if i % 2 == 0 else "review",
                ai_confidence=0.80 + i * 0.05,
                linked_schemes=["PM-KISAN"] if i == 1 else []
            )
            mock_claims.append(claim)
        
        for claim in mock_claims:
            existing = await db.claims.find_one({"claim_number": claim.claim_number})
            if not existing:
                await db.claims.insert_one(claim.dict())
    
    return {"message": "Mock data generated successfully"}

# User routes
@api_router.get("/users", response_model=List[User])
async def get_users(role: Optional[UserRole] = Query(None)):
    """Get users with optional role filtering"""
    filter_dict = {}
    if role:
        filter_dict["role"] = role
    
    users = await db.users.find(filter_dict).to_list(length=None)
    return [User(**user) for user in users]

@api_router.post("/users", response_model=User)
async def create_user(user: User):
    """Create a new user"""
    user_dict = user.dict()
    await db.users.insert_one(user_dict)
    return user

# Map data routes
@api_router.get("/map/villages")
async def get_villages_geojson(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None)
):
    """Get villages as GeoJSON for mapping"""
    filter_dict = {}
    if state:
        filter_dict["state"] = state
    if district:
        filter_dict["district"] = district
    
    villages = await db.villages.find(filter_dict).to_list(length=None)
    
    features = []
    for village in villages:
        feature = {
            "type": "Feature",
            "properties": {
                "id": village["id"],
                "name": village["name"],
                "state": village["state"],
                "district": village["district"],
                "tehsil": village["tehsil"],
                "total_forest_area": village["total_forest_area"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [village["coordinates"]["lng"], village["coordinates"]["lat"]]
            }
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@api_router.get("/map/claims")
async def get_claims_geojson(
    status: Optional[ClaimStatus] = Query(None),
    village_id: Optional[str] = Query(None)
):
    """Get claims as GeoJSON for mapping"""
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    if village_id:
        filter_dict["village_id"] = village_id
    
    claims = await db.claims.find(filter_dict).to_list(length=None)
    
    # Get village coordinates for each claim
    features = []
    for claim in claims:
        village = await db.villages.find_one({"id": claim["village_id"]})
        if village:
            feature = {
                "type": "Feature",
                "properties": {
                    "id": claim["id"],
                    "claim_number": claim["claim_number"],
                    "beneficiary_name": claim["beneficiary_name"],
                    "status": claim["status"],
                    "claim_type": claim["claim_type"],
                    "area_claimed": claim["area_claimed"],
                    "ai_recommendation": claim["ai_recommendation"],
                    "ai_confidence": claim["ai_confidence"],
                    "village_name": village["name"]
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [village["coordinates"]["lng"], village["coordinates"]["lat"]]
                }
            }
            features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()