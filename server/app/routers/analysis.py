from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
from skimage.metrics import structural_similarity as ssim
from ultralytics import YOLO
import shutil

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"]
)

DATASET_DIR = "dataset"
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
REFERENCE_IMAGE_PATH = os.path.join(DATASET_DIR, "reference.jpg")
MODEL_PATH = "runs/classify/train/weights/best.pt"

# Ensure dataset directory exists
os.makedirs(DATASET_DIR, exist_ok=True)

def load_image_from_upload(file: UploadFile):
    try:
        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

@router.post("/set-reference")
async def set_reference(file: UploadFile = File(...)):
    """Save the uploaded image as the Golden Sample for SSIM."""
    img = load_image_from_upload(file)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    # Resize to standard size for consistency (e.g., 640x640)
    img_resized = cv2.resize(img, (640, 640))
    cv2.imwrite(REFERENCE_IMAGE_PATH, img_resized)
    
    return {"message": "Reference image set successfully"}

@router.post("/ssim")
async def analyze_ssim(file: UploadFile = File(...), threshold: float = 0.90):
    """Compare uploaded image with reference using SSIM."""
    if not os.path.exists(REFERENCE_IMAGE_PATH):
        raise HTTPException(status_code=404, detail="Reference image not found. Please set a reference first.")
    
    target_img = load_image_from_upload(file)
    if target_img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    # Load reference
    ref_img = cv2.imread(REFERENCE_IMAGE_PATH)
    
    # Resize target to match reference
    target_resized = cv2.resize(target_img, (ref_img.shape[1], ref_img.shape[0]))
    
    # Convert to grayscale for SSIM
    ref_gray = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)
    target_gray = cv2.cvtColor(target_resized, cv2.COLOR_BGR2GRAY)
    
    # Calculate SSIM
    score, diff = ssim(ref_gray, target_gray, full=True)
    
    result = "PASS" if score >= threshold else "FAIL"
    
    return {
        "method": "SSIM",
        "score": float(score),
        "threshold": threshold,
        "result": result
    }

def train_yolo_task():
    """Background task to train YOLO model."""
    try:
        # Check if we have enough data
        good_dir = os.path.join(PROCESSED_DIR, "good")
        bad_dir = os.path.join(PROCESSED_DIR, "bad")
        
        if not os.path.exists(good_dir) or not os.path.exists(bad_dir):
            print("Data directories missing")
            return

        # YOLO expects data in a specific format for classification
        # root/
        #   train/
        #     good/
        #     bad/
        #   val/
        #     good/
        #     bad/
        # For simplicity in this hackathon, we will just point YOLO to the processed folder 
        # and let it split automatically if possible, or we just use it as 'train' source.
        # Ultralytics 'classify' mode usually needs split folders. 
        # Let's try to use the processed folder directly.
        
        model = YOLO('yolov8n-cls.pt')  # load a pretrained model (nano version for speed)
        
        # Train the model
        # data argument should point to a directory with class folders
        results = model.train(data=PROCESSED_DIR, epochs=5, imgsz=640)
        
        print("Training complete")
    except Exception as e:
        print(f"Training failed: {e}")

@router.post("/train")
async def train_model(background_tasks: BackgroundTasks):
    """Trigger YOLO training in background."""
    background_tasks.add_task(train_yolo_task)
    return {"message": "Training started in background. Check server logs for progress."}

@router.post("/cnn")
async def analyze_cnn(file: UploadFile = File(...)):
    """Analyze image using trained YOLO model."""
    # Find the best model path (it might change based on training runs)
    # Usually runs/classify/train/weights/best.pt, then train2, train3...
    # We need a way to find the latest model.
    
    model_file = None
    # Search for latest training run in the workspace root (parent of server)
    # Because we run python from server/, but YOLO saves to CWD/runs if not specified?
    # Actually, the logs show it saves to /home/noclout/QC_hackaton/runs
    # But we are in /home/noclout/QC_hackaton/server
    
    # Try looking in parent directory first
    workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # workspace_root is /home/noclout/QC_hackaton/server/app/.. -> /home/noclout/QC_hackaton/server -> .. -> /home/noclout/QC_hackaton
    
    # Actually, let's just look relative to where we are.
    # If we are in server/, runs is in ../runs
    
    possible_runs_dirs = [
        "runs/classify", # If runs is inside server/
        "../runs/classify" # If runs is in workspace root
    ]
    
    runs_dir = None
    for d in possible_runs_dirs:
        if os.path.exists(d):
            runs_dir = d
            break
            
    if runs_dir:
        train_dirs = sorted([d for d in os.listdir(runs_dir) if d.startswith("train")], key=lambda x: os.path.getmtime(os.path.join(runs_dir, x)), reverse=True)
        if train_dirs:
            latest_run = train_dirs[0]
            potential_path = os.path.join(runs_dir, latest_run, "weights", "best.pt")
            if os.path.exists(potential_path):
                model_file = potential_path
    
    if not model_file:
         # Fallback to a default if exists, or error
         if os.path.exists("yolov8n-cls.pt"):
             # This is just the base model, won't know Good/Bad classes specifically unless trained
             # But maybe better than crashing
             pass
         print(f"DEBUG: Could not find model. Checked {possible_runs_dirs}")
         raise HTTPException(status_code=404, detail="Trained model not found. Please train the model first.")

    try:
        model = YOLO(model_file)
        img = load_image_from_upload(file)
        
        # Predict
        results = model(img)
        
        # Parse results
        # results[0].probs.top1 -> index of top class
        # results[0].names -> dict of class names
        
        top1_index = results[0].probs.top1
        confidence = results[0].probs.top1conf.item()
        label = results[0].names[top1_index]
        
        # Assuming classes are "good" and "bad"
        result = "PASS" if label.lower() == "good" else "FAIL"
        
        return {
            "method": "CNN",
            "label": label,
            "confidence": confidence,
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
