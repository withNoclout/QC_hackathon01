import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Settings, History, Camera } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

function Dashboard() {
  const [stats, setStats] = useState({ total: 120, pass: 115, fail: 5 });
  const [threshold, setThreshold] = useState(0.85);
  const [status, setStatus] = useState('IDLE'); // PASS, FAIL, IDLE
  const [history, setHistory] = useState([
    { id: 1, time: '10:00:01', status: 'PASS', confidence: 0.98 },
    { id: 2, time: '10:00:05', status: 'PASS', confidence: 0.95 },
    { id: 3, time: '10:00:12', status: 'FAIL', confidence: 0.45 },
    { id: 4, time: '10:00:15', status: 'PASS', confidence: 0.99 },
  ]);
  const [model, setModel] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [similarity, setSimilarity] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const referenceCanvasRef = useRef(null);

  // Helper: Compare two image data arrays (Simple Pixel Diff)
  const calculateSimilarity = (imgData1, imgData2) => {
    let diff = 0;
    const totalPixels = imgData1.data.length / 4; // RGBA
    
    for (let i = 0; i < imgData1.data.length; i += 4) {
      // Compare RGB channels
      const rDiff = Math.abs(imgData1.data[i] - imgData2.data[i]);
      const gDiff = Math.abs(imgData1.data[i + 1] - imgData2.data[i + 1]);
      const bDiff = Math.abs(imgData1.data[i + 2] - imgData2.data[i + 2]);
      
      diff += (rDiff + gDiff + bDiff) / 3;
    }
    
    const avgDiff = diff / totalPixels;
    // Invert diff to get similarity (0 diff = 100% similar)
    // 255 is max difference per pixel
    return Math.max(0, 100 - (avgDiff / 255 * 100));
  };

  const captureReference = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Capture the current video frame to a hidden canvas
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 100; // Small size for comparison
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Draw the center of the video (assuming object is centered)
    // Or better: if we have a detection, crop that. 
    // For simplicity in this hackathon, we'll capture the center square.
    const size = Math.min(video.videoWidth, video.videoHeight) * 0.6;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 100, 100);
    
    const imageData = ctx.getImageData(0, 0, 100, 100);
    setReferenceImage(imageData);
    
    // Show preview
    if (referenceCanvasRef.current) {
      const refCtx = referenceCanvasRef.current.getContext('2d');
      referenceCanvasRef.current.width = 100;
      referenceCanvasRef.current.height = 100;
      refCtx.putImageData(imageData, 0, 0);
    }
    
    console.log("Reference captured!");
  };

  // Load Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        console.log('COCO-SSD Model loaded.');
      } catch (err) {
        console.error('Failed to load model', err);
      }
    };
    loadModel();
  }, []);

  // Setup Camera
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const startVideo = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              setIsCameraReady(true);
              videoRef.current.play();
            };
          }
        } catch (err) {
          console.error('Error accessing webcam:', err);
        }
      };
      startVideo();
    }
  }, []);

  // Detection Loop
  useEffect(() => {
    let animationId;

    const detect = async () => {
      if (model && isCameraReady && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to video size
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Detect objects
        const predictions = await model.detect(video);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find the largest object (closest)
        let largestPrediction = null;
        let maxArea = 0;

        predictions.forEach((prediction) => {
          const [x, y, width, height] = prediction.bbox;
          const area = width * height;
          if (area > maxArea) {
            maxArea = area;
            largestPrediction = prediction;
          }
        });

        // Draw bounding box for the largest object
        if (largestPrediction) {
          const [x, y, width, height] = largestPrediction.bbox;
          
          // Draw Box
          ctx.strokeStyle = '#00FF00'; // Green
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);

          // --- QUALITY CHECK LOGIC ---
          let currentStatus = 'IDLE';
          let currentScore = 0;

          if (referenceImage) {
            // 1. Extract the detected object
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 100;
            tempCanvas.height = 100;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw the detected area resized to 100x100
            tempCtx.drawImage(video, x, y, width, height, 0, 0, 100, 100);
            const currentObjectData = tempCtx.getImageData(0, 0, 100, 100);
            
            // 2. Compare with Reference
            const simScore = calculateSimilarity(referenceImage, currentObjectData);
            setSimilarity(simScore);
            currentScore = simScore;

            // 3. Decide Pass/Fail
            if (simScore > (threshold * 100)) {
              currentStatus = 'PASS';
              ctx.strokeStyle = '#00FF00'; // Green
            } else {
              currentStatus = 'FAIL';
              ctx.strokeStyle = '#FF0000'; // Red
              ctx.strokeRect(x, y, width, height); // Redraw red
            }
          } else {
            // No reference set yet
            ctx.strokeStyle = '#FFFF00'; // Yellow
            ctx.strokeRect(x, y, width, height);
          }

          // Draw Label
          ctx.fillStyle = currentStatus === 'FAIL' ? '#FF0000' : '#00FF00';
          ctx.font = '18px Arial';
          const label = referenceImage 
            ? `${currentStatus} (${Math.round(currentScore)}% Match)`
            : `${largestPrediction.class} (No Ref)`;
            
          ctx.fillText(label, x, y > 20 ? y - 5 : 20);
          
          // Update global status (debounced slightly in real app)
          setStatus(currentStatus);
          
        } else {
             setStatus('IDLE');
        }
      }
      animationId = requestAnimationFrame(detect);
    };

    if (model && isCameraReady) {
      detect();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [model, isCameraReady, threshold]);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-wider">QC HACKATHON SYSTEM</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Online
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Video Feed & Live Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Feed Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg relative group">
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-white z-10 flex items-center gap-2">
              <Camera className="w-3 h-3" />
              LIVE FEED {model ? '(AI ACTIVE)' : '(LOADING AI...)'}
            </div>
            <div className="aspect-video bg-black flex items-center justify-center text-slate-600 relative">
              
              {/* Video Element */}
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                playsInline
              />
              
              {/* Canvas Overlay for Bounding Boxes */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {!isCameraReady && (
                <div className="text-center z-10">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-20 animate-pulse" />
                  <p>Initializing Camera & AI...</p>
                </div>
              )}
            </div>
            
            {/* Live Status Overlay (Simulated) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Current Detection</p>
                  <p className="text-xl font-bold text-white">Product #12345</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${
                  status === 'PASS' ? 'bg-green-500/20 text-green-400' : 
                  status === 'FAIL' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {status === 'PASS' && <CheckCircle className="w-5 h-5" />}
                  {status === 'FAIL' && <XCircle className="w-5 h-5" />}
                  {status === 'IDLE' ? 'READY' : status}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Controls */}
        <div className="space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Scanned</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-blue-400">
                {stats.total > 0 ? ((stats.pass / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Passed</p>
              <p className="text-3xl font-bold text-green-400">{stats.pass}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-400">{stats.fail}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Configuration</h2>
            </div>

            {/* Reference Image Section */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Golden Sample (Reference)</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black rounded border border-slate-600 overflow-hidden">
                  <canvas ref={referenceCanvasRef} className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={captureReference}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Set Reference
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Place a perfect product in the frame and click to set it as the standard.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Similarity Threshold</span>
                <span className="text-blue-400 font-mono">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button 
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              onClick={() => setStats({ total: 0, pass: 0, fail: 0 })}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Counters
            </button>
          </div>
        </div>

        {/* Bottom Row: History Log */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold">Recent Inspections</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-slate-400">#{item.id}</td>
                      <td className="px-6 py-3">{item.time}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'PASS' 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {item.status === 'PASS' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono">
                        {(item.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
