import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="absolute inset-0 bg-white bg-opacity-85 flex flex-col items-center justify-center rounded-lg z-10">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    <p className="mt-4 text-indigo-600 font-semibold">{message}</p>
  </div>
);

function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // רפרנס לקנבס הציור
  const modelRef = useRef(null);
  const stabilityCounter = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading AI Model...');
  
  useEffect(() => {
    async function loadModel() {
      try {
        const model = await cocoSsd.load();
        modelRef.current = model;
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load model", err);
        setLoadingMessage('Error loading model.');
      }
    }
    loadModel();
  }, []);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            // התחל את לולאת הזיהוי רק אחרי שהווידאו באמת נטען
            startDetection();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    // הפעל את המצלמה רק אחרי שהמודל נטען
    if (!isLoading) {
      setupCamera();
    }
  }, [isLoading]); // תלות ב-isLoading

  const startDetection = useCallback(() => {
    if (modelRef.current && videoRef.current && videoRef.current.readyState >= 3) {
      detectFrame();
    } else {
      // נסה שוב עוד רגע אם לא מוכן
      requestAnimationFrame(startDetection);
    }
  }, []);

  const detectFrame = async () => {
    if (!modelRef.current || !videoRef.current || !videoRef.current.srcObject) return;

    const predictions = await modelRef.current.detect(videoRef.current);
    
    // === לוג לניפוי באגים: מה המודל רואה? ===
    if (predictions.length > 0) {
        console.log("Detections: ", predictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`).join(', '));
    }
    
    const bookPrediction = predictions.find(p => p.class === 'book' && p.score > 0.6);
    
    // הגדרת הקנבס לציור
    const canvas = canvasRef.current;
    if (canvas && videoRef.current) {
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        // נקה ציורים קודמים
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (bookPrediction) {
      // === משוב ויזואלי: צייר מסגרת ירוקה ===
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#00FF00'; // ירוק זוהר
          ctx.lineWidth = 4;
          const [x, y, width, height] = bookPrediction.bbox;
          ctx.strokeRect(x, y, width, height);
      }
      
      stabilityCounter.current += 1;
      console.log(`Stability counter: ${stabilityCounter.current}`); 

      if (stabilityCounter.current > 10) {
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = videoRef.current.videoWidth;
        captureCanvas.height = videoRef.current.videoHeight;
        captureCanvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        onCapture(captureCanvas.toDataURL('image/jpeg'));
        
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        return;
      }
    } else {
      stabilityCounter.current = 0;
    }

    requestAnimationFrame(detectFrame);
  };

  return (
    <div className="relative w-full h-[80vh] bg-black rounded-lg">
      {isLoading && <LoadingSpinner message={loadingMessage} />}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {/* קנבס שקוף שישב מעל הווידאו וישמש לציור */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      <button 
        onClick={onCancel} 
        className="absolute top-4 right-4 bg-white bg-opacity-80 text-black rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-lg z-20"
      >
        ×
      </button>
    </div>
  );
}

export default CameraCapture;