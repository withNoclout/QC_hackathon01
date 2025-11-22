from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import cv2
import numpy as np
from datetime import datetime

router = APIRouter(
    prefix="/dataset",
    tags=["dataset"]
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

RAW_GOOD_DIR = os.path.join(DATASET_DIR, "raw", "good")
RAW_BAD_DIR = os.path.join(DATASET_DIR, "raw", "bad")
RAW_AUGMENTATION_DIR = os.path.join(DATASET_DIR, "raw", "augmentation")

PROCESSED_GOOD_DIR = os.path.join(DATASET_DIR, "processed", "good")
PROCESSED_BAD_DIR = os.path.join(DATASET_DIR, "processed", "bad")
PROCESSED_AUGMENTATION_DIR = os.path.join(DATASET_DIR, "processed", "augmentation")

# Ensure directories exist (redundant check but good for safety)
for directory in [RAW_GOOD_DIR, RAW_BAD_DIR, PROCESSED_GOOD_DIR, PROCESSED_BAD_DIR, RAW_AUGMENTATION_DIR, PROCESSED_AUGMENTATION_DIR]:
    os.makedirs(directory, exist_ok=True)

def process_image(image_path, output_path):
    """
    Process the image: Read, Resize, and Save.
    Standard size for many AI models is 224x224 or 640x640 (YOLO).
    Let's go with 640x640 as we are using YOLO/COCO-SSD context.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False
        
        # Resize
        img_resized = cv2.resize(img, (640, 640))
        
        # Save processed image
        cv2.imwrite(output_path, img_resized)
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

@router.post("/capture/{label}")
async def capture_image(label: str, file: UploadFile = File(...)):
    """
    Capture an image and save it to the dataset.
    label: 'good', 'bad', or any custom label (saved to augmentation folder)
    """
    # if label not in ["good", "bad"]:
    #     raise HTTPException(status_code=400, detail="Invalid label. Must be 'good' or 'bad'.")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{timestamp}.jpg"
    
    # Determine paths
    if label == "good":
        raw_path = os.path.join(RAW_GOOD_DIR, filename)
        processed_path = os.path.join(PROCESSED_GOOD_DIR, filename)
    elif label == "bad":
        raw_path = os.path.join(RAW_BAD_DIR, filename)
        processed_path = os.path.join(PROCESSED_BAD_DIR, filename)
    else:
        # Custom label -> Augmentation
        # Create subdirectories for the label
        raw_label_dir = os.path.join(RAW_AUGMENTATION_DIR, label)
        processed_label_dir = os.path.join(PROCESSED_AUGMENTATION_DIR, label)
        
        os.makedirs(raw_label_dir, exist_ok=True)
        os.makedirs(processed_label_dir, exist_ok=True)
        
        raw_path = os.path.join(raw_label_dir, filename)
        processed_path = os.path.join(processed_label_dir, filename)
    
    # Save Raw Image
    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save raw image: {str(e)}")
        
    # Process Image
    success = process_image(raw_path, processed_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process image")
    
    return {
        "status": "success",
        "label": label,
        "raw_path": raw_path,
        "processed_path": processed_path
    }

@router.delete("/clear")
async def clear_dataset():
    """Clear all images from the dataset."""
    try:
        for directory in [RAW_GOOD_DIR, RAW_BAD_DIR, PROCESSED_GOOD_DIR, PROCESSED_BAD_DIR, RAW_AUGMENTATION_DIR, PROCESSED_AUGMENTATION_DIR]:
            # Remove all files in the directory
            if os.path.exists(directory):
                for filename in os.listdir(directory):
                    file_path = os.path.join(directory, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as e:
                        print(f'Failed to delete {file_path}. Reason: {e}')
        return {"message": "Dataset cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear dataset: {e}")
