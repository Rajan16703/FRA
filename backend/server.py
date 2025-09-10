from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
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
import aiofiles
import mimetypes
import random
import string


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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

class DocumentType(str, Enum):
    IDENTITY_PROOF = "identity_proof"
    ADDRESS_PROOF = "address_proof"
    LAND_DOCUMENT = "land_document"
    SURVEY_SETTLEMENT = "survey_settlement"
    FOREST_CLEARANCE = "forest_clearance"
    PHOTOGRAPH = "photograph"
    OTHER = "other"

class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    OCR_COMPLETED = "ocr_completed"
    VERIFIED = "verified"
    REJECTED = "rejected"

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

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    document_type: DocumentType
    status: DocumentStatus
    claim_id: Optional[str] = None
    version: int = 1
    parent_document_id: Optional[str] = None  # For versioning
    ocr_text: Optional[str] = None
    ocr_confidence: float = 0.0
    ocr_metadata: Dict[str, Any] = {}
    uploaded_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OCRResult(BaseModel):
    text: str
    confidence: float
    metadata: Dict[str, Any] = {}
    extracted_fields: Dict[str, str] = {}

class Analytics(BaseModel):
    total_villages: int
    total_claims: int
    pending_claims: int
    approved_claims: int
    rejected_claims: int
    average_processing_time: float
    ocr_accuracy: float
    scheme_integration_count: int
    total_documents: int = 0
    documents_with_ocr: int = 0

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

class DocumentUpdate(BaseModel):
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None

# Helper functions
def generate_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    name, ext = os.path.splitext(original_filename)
    unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{unique_id}_{name}{ext}"

async def mock_ocr_processing(file_path: str, mime_type: str) -> OCRResult:
    """Mock OCR processing - replace with real OCR service"""
    
    # Simulate processing delay
    await asyncio.sleep(0.5)
    
    # Mock OCR text based on file type
    if "pdf" in mime_type.lower():
        mock_text = f"""
        FOREST RIGHTS CERTIFICATE
        
        Government of India
        Ministry of Environment, Forest and Climate Change
        
        Certificate No: FRC/{random.randint(1000, 9999)}/2024
        
        This is to certify that Shri/Smt. [Beneficiary Name] 
        Son/Daughter of [Father's Name]
        Village: [Village Name]
        District: [District Name]
        State: [State Name]
        
        is hereby granted Individual Forest Rights under 
        The Scheduled Tribes and Other Traditional Forest 
        Dwellers (Recognition of Forest Rights) Act, 2006
        
        Area Granted: {random.uniform(1.0, 5.0):.2f} hectares
        Survey Number: {random.randint(100, 999)}/{random.randint(1, 50)}
        
        Date of Issue: {datetime.now().strftime('%d/%m/%Y')}
        
        Authorized Signatory
        District Collector
        """
    else:
        # For images
        mock_text = f"""
        Aadhaar Card / Identity Document
        
        Name: [Name from document]
        DOB: {random.randint(1, 28)}/{random.randint(1, 12)}/{random.randint(1960, 2000)}
        Address: Village [Village Name], District [District Name]
        Aadhaar: XXXX-XXXX-{random.randint(1000, 9999)}
        """
    
    # Extract some fields
    extracted_fields = {
        "beneficiary_name": f"Beneficiary {random.randint(1, 100)}",
        "village": f"Village {random.randint(1, 50)}",
        "area": f"{random.uniform(1.0, 5.0):.2f}",
        "survey_number": f"{random.randint(100, 999)}/{random.randint(1, 50)}"
    }
    
    confidence = random.uniform(0.75, 0.98)
    
    return OCRResult(
        text=mock_text.strip(),
        confidence=confidence,
        metadata={
            "processing_time": random.uniform(0.5, 2.0),
            "language": "english",
            "pages": 1 if "image" in mime_type else random.randint(1, 5)
        },
        extracted_fields=extracted_fields
    )

# Routes

@api_router.get("/")
async def root():
    return {"message": "FRA-Connect API - Forest Rights Atlas & Decision Support System"}

# Document routes
@api_router.post("/documents/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    claim_id: Optional[str] = Form(None),
    uploaded_by: str = Form("admin")
):
    """Upload a new document"""
    
    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/jpeg",
        "image/jpg", 
        "image/png",
        "image/tiff",
        "image/bmp"
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not supported")
    
    # Generate unique filename
    filename = generate_filename(file.filename)
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create document record
    document = Document(
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        document_type=document_type,
        status=DocumentStatus.UPLOADED,
        claim_id=claim_id,
        uploaded_by=uploaded_by
    )
    
    # Save to database
    doc_dict = document.dict()
    await db.documents.insert_one(doc_dict)
    
    return document

@api_router.post("/documents/{document_id}/ocr")
async def process_ocr(document_id: str):
    """Process OCR for a document"""
    
    # Get document
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update status to processing
    await db.documents.update_one(
        {"id": document_id},
        {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
    )
    
    # Mock OCR processing
    ocr_result = await mock_ocr_processing(doc["file_path"], doc["mime_type"])
    
    # Update document with OCR results
    update_data = {
        "status": "ocr_completed",
        "ocr_text": ocr_result.text,
        "ocr_confidence": ocr_result.confidence,
        "ocr_metadata": ocr_result.metadata,
        "updated_at": datetime.utcnow()
    }
    
    await db.documents.update_one({"id": document_id}, {"$set": update_data})
    
    return {
        "document_id": document_id,
        "status": "ocr_completed",
        "ocr_result": ocr_result
    }

@api_router.get("/documents", response_model=List[Document])
async def get_documents(
    claim_id: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    status: Optional[DocumentStatus] = Query(None),
    limit: int = Query(50, le=100)
):
    """Get documents with filtering"""
    filter_dict = {}
    if claim_id:
        filter_dict["claim_id"] = claim_id
    if document_type:
        filter_dict["document_type"] = document_type
    if status:
        filter_dict["status"] = status
    
    documents = await db.documents.find(filter_dict).limit(limit).to_list(length=None)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str):
    """Get specific document"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return Document(**doc)

@api_router.put("/documents/{document_id}", response_model=Document)
async def update_document(document_id: str, update_data: DocumentUpdate):
    """Update document details"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.documents.update_one({"id": document_id}, {"$set": update_dict})
    
    updated_doc = await db.documents.find_one({"id": document_id})
    return Document(**updated_doc)

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete document"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    try:
        os.remove(doc["file_path"])
    except OSError:
        pass  # File might not exist
    
    # Delete from database
    await db.documents.delete_one({"id": document_id})
    
    return {"message": "Document deleted successfully"}

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str):
    """Download document file"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = doc["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=doc["original_filename"],
        media_type=doc["mime_type"]
    )

@api_router.post("/documents/{document_id}/version", response_model=Document)
async def create_document_version(
    document_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form("admin")
):
    """Create a new version of an existing document"""
    
    # Get parent document
    parent_doc = await db.documents.find_one({"id": document_id})
    if not parent_doc:
        raise HTTPException(status_code=404, detail="Parent document not found")
    
    # Get current max version for this document family
    max_version = await db.documents.find({
        "$or": [
            {"id": document_id},
            {"parent_document_id": document_id}
        ]
    }).sort("version", -1).limit(1).to_list(1)
    
    new_version = (max_version[0]["version"] if max_version else 1) + 1
    
    # Generate unique filename
    filename = generate_filename(file.filename)
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create new document version
    new_doc = Document(
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        document_type=parent_doc["document_type"],
        status=DocumentStatus.UPLOADED,
        claim_id=parent_doc["claim_id"],
        version=new_version,
        parent_document_id=document_id,
        uploaded_by=uploaded_by
    )
    
    # Save to database
    doc_dict = new_doc.dict()
    await db.documents.insert_one(doc_dict)
    
    return new_doc

@api_router.get("/documents/{document_id}/versions", response_model=List[Document])
async def get_document_versions(document_id: str):
    """Get all versions of a document"""
    versions = await db.documents.find({
        "$or": [
            {"id": document_id},
            {"parent_document_id": document_id}
        ]
    }).sort("version", 1).to_list(length=None)
    
    return [Document(**doc) for doc in versions]

@api_router.post("/documents/bulk-upload")
async def bulk_upload_documents(
    files: List[UploadFile] = File(...),
    document_type: DocumentType = Form(...),
    claim_id: Optional[str] = Form(None),
    uploaded_by: str = Form("admin")
):
    """Upload multiple documents at once"""
    
    uploaded_docs = []
    failed_uploads = []
    
    for file in files:
        try:
            # Validate file type
            allowed_types = [
                "application/pdf",
                "image/jpeg",
                "image/jpg", 
                "image/png",
                "image/tiff",
                "image/bmp"
            ]
            
            if file.content_type not in allowed_types:
                failed_uploads.append({
                    "filename": file.filename,
                    "error": "File type not supported"
                })
                continue
            
            # Generate unique filename
            filename = generate_filename(file.filename)
            file_path = UPLOAD_DIR / filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Create document record
            document = Document(
                filename=filename,
                original_filename=file.filename,
                file_path=str(file_path),
                file_size=len(content),
                mime_type=file.content_type,
                document_type=document_type,
                status=DocumentStatus.UPLOADED,
                claim_id=claim_id,
                uploaded_by=uploaded_by
            )
            
            # Save to database
            doc_dict = document.dict()
            await db.documents.insert_one(doc_dict)
            
            uploaded_docs.append(document)
            
        except Exception as e:
            failed_uploads.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "uploaded_documents": uploaded_docs,
        "failed_uploads": failed_uploads,
        "total_uploaded": len(uploaded_docs),
        "total_failed": len(failed_uploads)
    }

@api_router.post("/documents/bulk-ocr")
async def bulk_ocr_processing(document_ids: List[str]):
    """Process OCR for multiple documents"""
    
    results = []
    
    for doc_id in document_ids:
        try:
            # Get document
            doc = await db.documents.find_one({"id": doc_id})
            if not doc:
                results.append({
                    "document_id": doc_id,
                    "status": "error",
                    "error": "Document not found"
                })
                continue
            
            # Update status to processing
            await db.documents.update_one(
                {"id": doc_id},
                {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
            )
            
            # Mock OCR processing
            ocr_result = await mock_ocr_processing(doc["file_path"], doc["mime_type"])
            
            # Update document with OCR results
            update_data = {
                "status": "ocr_completed",
                "ocr_text": ocr_result.text,
                "ocr_confidence": ocr_result.confidence,
                "ocr_metadata": ocr_result.metadata,
                "updated_at": datetime.utcnow()
            }
            
            await db.documents.update_one({"id": doc_id}, {"$set": update_data})
            
            results.append({
                "document_id": doc_id,
                "status": "completed",
                "ocr_result": ocr_result
            })
            
        except Exception as e:
            results.append({
                "document_id": doc_id,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "results": results,
        "total_processed": len([r for r in results if r["status"] == "completed"]),
        "total_failed": len([r for r in results if r["status"] == "error"])
    }

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
    
    # Document analytics
    total_documents = await db.documents.count_documents({})
    documents_with_ocr = await db.documents.count_documents({"ocr_text": {"$ne": None}})
    
    return Analytics(
        total_villages=total_villages,
        total_claims=total_claims,
        pending_claims=pending_claims,
        approved_claims=approved_claims,
        rejected_claims=rejected_claims,
        average_processing_time=15.5,  # Mock data
        ocr_accuracy=0.92,  # Mock data
        scheme_integration_count=150,  # Mock data
        total_documents=total_documents,
        documents_with_ocr=documents_with_ocr
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
    
    # Create some mock documents
    claims = await db.claims.find().limit(2).to_list(length=None)
    if claims:
        for i, claim in enumerate(claims):
            # Create mock document entries (without actual files for demo)
            mock_docs = [
                Document(
                    filename=f"mock_identity_{i}.pdf",
                    original_filename=f"identity_proof_{i+1}.pdf",
                    file_path=f"/mock/path/identity_{i}.pdf",
                    file_size=random.randint(100000, 500000),
                    mime_type="application/pdf",
                    document_type=DocumentType.IDENTITY_PROOF,
                    status=DocumentStatus.OCR_COMPLETED,
                    claim_id=claim["id"],
                    uploaded_by="admin",
                    ocr_text="Mock OCR text for identity document",
                    ocr_confidence=random.uniform(0.85, 0.95)
                ),
                Document(
                    filename=f"mock_land_{i}.pdf",
                    original_filename=f"land_document_{i+1}.pdf",
                    file_path=f"/mock/path/land_{i}.pdf",
                    file_size=random.randint(150000, 300000),
                    mime_type="application/pdf",
                    document_type=DocumentType.LAND_DOCUMENT,
                    status=DocumentStatus.VERIFIED,
                    claim_id=claim["id"],
                    uploaded_by="admin",
                    ocr_text="Mock OCR text for land document",
                    ocr_confidence=random.uniform(0.88, 0.96)
                )
            ]
            
            for doc in mock_docs:
                existing = await db.documents.find_one({"filename": doc.filename})
                if not existing:
                    await db.documents.insert_one(doc.dict())
    
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

# Import asyncio for OCR processing
import asyncio