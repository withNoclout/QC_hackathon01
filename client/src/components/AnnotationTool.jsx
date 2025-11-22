import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Save, ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';

const AnnotationTool = ({ onBack, streamUrl }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState(null); // { x, y, w, h }
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const ipImageRef = useRef(null); // Ref for the IP Camera stream image
  const [cameraMode, setCameraMode] = useState('upload'); // 'upload', 'webcam', 'ip'
  const [stream, setStream] = useState(null);
  const [customLabel, setCustomLabel] = useState(''); // New state for custom label
  const [isCapturing, setIsCapturing] = useState(false);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setSelection(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access webcam");
    }
  };

  const captureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      setImageSrc(canvas.toDataURL('image/jpeg'));
      setSelection(null);
      // Stop stream after capture to save resources? Or keep it?
      // Let's keep it running if they want to retake.
    }
  };

  const captureIpCamera = async () => {
      if (!streamUrl) {
          alert("No IP Camera URL configured");
          return;
      }
      
      // Method 1: Capture directly from the <img> tag (Fastest, no extra request)
      if (ipImageRef.current) {
          try {
              const img = ipImageRef.current;
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              
              // Draw the current frame from the <img> tag to canvas
              // Note: This requires crossOrigin="anonymous" on the img tag, which we have.
              canvas.getContext('2d').drawImage(img, 0, 0);
              
              setImageSrc(canvas.toDataURL('image/jpeg'));
              setSelection(null);
              return; // Success!
          } catch (e) {
              console.warn("Direct capture failed (likely CORS taint), falling back to fetch...", e);
          }
      }

      // Method 2: Fetch from /capture (Fallback)
      setIsCapturing(true);
      try {
        // Construct capture URL
        let captureUrl = streamUrl;
        if (captureUrl.includes('/stream')) {
            captureUrl = captureUrl.replace('/stream', '/capture');
        } else {
             captureUrl = captureUrl.replace(/\/+$/, '') + '/capture';
        }
        
        const response = await fetch(captureUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageSrc(reader.result);
            setSelection(null);
            setIsCapturing(false);
        };
        reader.readAsDataURL(blob);

      } catch (e) {
          console.error("Capture failed:", e);
          alert("Capture failed. Please ensure ESP32 firmware is updated.");
          setIsCapturing(false);
      }
  };

  // Drawing Logic
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    const pos = getMousePos(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setIsDrawing(true);
    setSelection(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    setCurrentPos(getMousePos(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Calculate selection
    const w = currentPos.x - startPos.x;
    const h = currentPos.y - startPos.y;
    
    // Allow drawing in any direction
    const x = w < 0 ? currentPos.x : startPos.x;
    const y = h < 0 ? currentPos.y : startPos.y;
    const width = Math.abs(w);
    const height = Math.abs(h);

    if (width > 10 && height > 10) {
        setSelection({ x, y, w: width, h: height });
    }
  };

  // Render Image and Selection
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imageSrc;
    
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Draw selection if exists
        if (selection) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
            
            // Dim the outside
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, selection.y); // Top
            ctx.fillRect(0, selection.y + selection.h, canvas.width, canvas.height - (selection.y + selection.h)); // Bottom
            ctx.fillRect(0, selection.y, selection.x, selection.h); // Left
            ctx.fillRect(selection.x + selection.w, selection.y, canvas.width - (selection.x + selection.w), selection.h); // Right
        } else if (isDrawing) {
            // Draw current drag
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(startPos.x, startPos.y, w, h);
        }
    };
  }, [imageSrc, selection, isDrawing, currentPos, startPos]);

  const saveCrop = async (label) => {
      if (!imageSrc || !selection) {
          alert("Please draw a box around the object first.");
          return;
      }

      // Create cropped canvas
      const img = new Image();
      img.src = imageSrc;
      await new Promise(r => img.onload = r);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = 640;
      cropCanvas.height = 640;
      const ctx = cropCanvas.getContext('2d');
      
      // Draw cropped portion resized to 640x640
      ctx.drawImage(img, selection.x, selection.y, selection.w, selection.h, 0, 0, 640, 640);

      cropCanvas.toBlob(async (blob) => {
          const formData = new FormData();
          formData.append('file', blob, `manual_crop_${Date.now()}.jpg`);
          
          try {
              const response = await fetch(`http://localhost:8000/dataset/capture/${label}`, {
                  method: 'POST',
                  body: formData
              });
              if (response.ok) {
                  alert(`Saved to ${label} dataset!`);
                  setSelection(null); // Reset selection for next one
              } else {
                  alert("Failed to save.");
              }
          } catch (e) {
              console.error(e);
              alert("Error saving.");
          }
      }, 'image/jpeg');
  };

  return (
    <div className="p-6 h-screen flex flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-slate-100">Manual Annotation Tool</h1>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setCameraMode('upload')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${cameraMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
                <Upload size={18} /> Upload
            </button>
            <button 
                onClick={() => { setCameraMode('webcam'); startWebcam(); }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${cameraMode === 'webcam' ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
                <Camera size={18} /> Webcam
            </button>
            <button 
                onClick={() => setCameraMode('ip')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${cameraMode === 'ip' ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
                <RefreshCw size={18} /> IP Camera
            </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 bg-slate-950 rounded-xl flex items-center justify-center overflow-auto relative border-2 border-dashed border-slate-800">
            {!imageSrc && cameraMode === 'webcam' && (
                <video ref={videoRef} autoPlay className="max-w-full max-h-full" />
            )}
            {!imageSrc && cameraMode === 'upload' && (
                <div className="text-center">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        ref={fileInputRef}
                    />
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Select Image File
                    </button>
                </div>
            )}
            {!imageSrc && cameraMode === 'ip' && (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {streamUrl ? (
                        <>
                            <img 
                                ref={ipImageRef}
                                src={streamUrl} 
                                alt="IP Camera Stream" 
                                className="max-w-full max-h-full object-contain"
                                crossOrigin="anonymous"
                            />
                            <button 
                                onClick={captureIpCamera}
                                disabled={isCapturing}
                                className={`absolute bottom-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-10 transition-all ${isCapturing ? 'opacity-50 cursor-wait scale-95' : 'hover:scale-110'}`}
                            >
                                {isCapturing ? <RefreshCw size={32} className="animate-spin" /> : <Camera size={32} />}
                            </button>
                        </>
                    ) : (
                        <div className="text-center">
                            <p className="mb-4 text-slate-400">IP Camera URL Not Configured</p>
                        </div>
                    )}
                </div>
            )}

            {imageSrc && (
                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="cursor-crosshair max-w-full max-h-full shadow-lg"
                    style={{ cursor: 'crosshair' }}
                />
            )}
            
            {/* Capture Button for Webcam */}
            {!imageSrc && cameraMode === 'webcam' && (
                <button 
                    onClick={captureWebcam}
                    className="absolute bottom-8 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700"
                >
                    <Camera size={32} />
                </button>
            )}
             {/* Clear Button */}
             {imageSrc && (
                <button 
                    onClick={() => { setImageSrc(null); setSelection(null); }}
                    className="absolute top-4 right-4 bg-slate-800 text-slate-200 px-3 py-1 rounded shadow hover:bg-slate-700 border border-slate-600"
                >
                    Clear Image
                </button>
            )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 bg-slate-800 rounded-xl shadow-sm p-6 flex flex-col gap-4 border border-slate-700">
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50">
                <h3 className="font-semibold text-blue-300 mb-2">Instructions</h3>
                <ol className="list-decimal list-inside text-sm text-blue-400 space-y-1">
                    <li>Load an image or capture from camera.</li>
                    <li>Click and drag to draw a box around the object.</li>
                    <li>Click a "Save" button below to add to dataset.</li>
                </ol>
            </div>

            <div className="flex-1">
                {selection ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400">Selection: {Math.round(selection.w)} x {Math.round(selection.h)}</p>
                        
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300">Label Name:</label>
                            <input 
                                type="text" 
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder="e.g. bottle, cap, good, bad"
                                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSelection(null)}
                                className="flex-1 py-3 bg-slate-700 text-slate-200 rounded-lg font-medium hover:bg-slate-600 flex items-center justify-center gap-2 transition-colors"
                            >
                                <RotateCcw size={18} /> Redo
                            </button>
                            <button 
                                onClick={() => saveCrop(customLabel || 'unknown')}
                                disabled={!customLabel}
                                className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                                    customLabel ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                <Save size={18} /> Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 mt-10">
                        Draw a box to enable saving options.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationTool;
