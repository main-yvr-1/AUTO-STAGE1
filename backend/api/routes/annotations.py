"""
API routes for annotation management
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from database.database import get_db
from database import operations as crud
from database.models import Annotation

router = APIRouter()

class AnnotationCreate(BaseModel):
    image_id: str
    bbox: List[float]
    class_id: int
    confidence: float = 1.0

@router.get("/")
async def get_annotations():
    """Get all annotations"""
    # TODO: Implement annotation listing
    return {"annotations": []}

@router.post("/")
async def create_annotation(annotation: AnnotationCreate):
    """Create a new annotation"""
    # TODO: Implement annotation creation
    return {"message": "Annotation created", "annotation": annotation}

@router.get("/{annotation_id}")
async def get_annotation(annotation_id: str):
    """Get annotation by ID"""
    # TODO: Implement annotation retrieval
    return {"annotation_id": annotation_id}

@router.put("/{annotation_id}")
async def update_annotation(annotation_id: str, annotation: AnnotationCreate):
    """Update annotation"""
    # TODO: Implement annotation update
    return {"message": "Annotation updated", "annotation_id": annotation_id}

@router.delete("/{annotation_id}")
async def delete_annotation(annotation_id: str):
    """Delete annotation"""
    # TODO: Implement annotation deletion
    return {"message": "Annotation deleted", "annotation_id": annotation_id}

# ==================== IMAGE-SPECIFIC ANNOTATION ENDPOINTS ====================

@router.get("/{image_id}/annotations")
async def get_image_annotations(image_id: str, db: Session = Depends(get_db)):
    """Get all annotations for a specific image"""
    try:
        annotations = crud.get_annotations_by_image(db, image_id)
        
        # Convert to frontend format
        annotation_list = []
        for ann in annotations:
            annotation_list.append({
                "id": ann.id,
                "class_name": ann.class_name,
                "class_id": ann.class_id,
                "confidence": ann.confidence,
                "bbox": [ann.x_min, ann.y_min, ann.x_max, ann.y_max],
                "segmentation": ann.segmentation
            })
        
        return {"annotations": annotation_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving annotations: {str(e)}")

@router.post("/{image_id}/annotations")
async def save_image_annotations(image_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    """Save annotations for a specific image"""
    try:
        annotations = data.get("annotations", [])
        
        # First, delete existing annotations for this image
        crud.AnnotationOperations.delete_annotations_by_image(db, image_id)
        
        # Create new annotations
        saved_annotations = []
        for ann in annotations:
            # Extract bbox coordinates
            bbox = ann.get("bbox", [])
            if len(bbox) != 4:
                continue
                
            x_min, y_min, x_max, y_max = bbox
            
            # Create annotation in database
            new_annotation = crud.AnnotationOperations.create_annotation(
                db=db,
                image_id=image_id,
                class_name=ann.get("class_name", "unknown"),
                class_id=ann.get("class_id", 0),
                x_min=float(x_min),
                y_min=float(y_min),
                x_max=float(x_max),
                y_max=float(y_max),
                confidence=float(ann.get("confidence", 1.0)),
                segmentation=ann.get("segmentation")
            )
            
            if new_annotation:
                saved_annotations.append(new_annotation)
        
        # Update image status to labeled if annotations exist
        if saved_annotations:
            crud.ImageOperations.update_image_status(db, image_id, is_labeled=True)
        
        return {
            "message": "Annotations saved successfully",
            "image_id": image_id,
            "count": len(saved_annotations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving annotations: {str(e)}")

@router.put("/{image_id}/annotations/{annotation_id}")
async def update_image_annotation(image_id: str, annotation_id: str, annotation: AnnotationCreate):
    """Update a specific annotation for an image"""
    # TODO: Implement annotation update
    return {
        "message": "Annotation updated",
        "image_id": image_id,
        "annotation_id": annotation_id
    }

@router.delete("/{image_id}/annotations/{annotation_id}")
async def delete_image_annotation(image_id: str, annotation_id: str):
    """Delete a specific annotation for an image"""
    # TODO: Implement annotation deletion
    return {
        "message": "Annotation deleted",
        "image_id": image_id,
        "annotation_id": annotation_id
    }