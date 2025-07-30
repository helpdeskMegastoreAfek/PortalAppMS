import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs'; // Required for coco-ssd

const LoadingSpinner = ({ text = 'Analyzing Document...' }) => (
  <div className="absolute inset-0 bg-white bg-opacity-85 flex flex-col items-center justify-center rounded-lg z-10">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
    <p className="mt-4 text-indigo-600 font-semibold">{text}</p>
  </div>
);

function DocumentScanner({ imageSrc, onProcessComplete }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(new Image());
  const [model, setModel] = useState(null); // מודל ה-ML
  const [cv, setCv] = useState(null); // ספריית OpenCV
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading AI & CV Libraries...');
  const [corners, setCorners] = useState([]);
  const [draggingPointIndex, setDraggingPointIndex] = useState(null);
  const [error, setError] = useState('');

  // טעינת הספריות במקביל
  useEffect(() => {
    let modelLoaded = false;
    let cvLoaded = false;

    const checkDone = () => {
      if (modelLoaded && cvLoaded) {
        console.log('Both AI model and CV library are ready.');
      }
    };

    cocoSsd
      .load()
      .then((loadedModel) => {
        setModel(loadedModel);
        modelLoaded = true;
        checkDone();
      })
      .catch((err) => {
        console.error('Failed to load AI model', err);
        setError('Failed to load AI model.');
      });

    if (window.cv) {
      setCv(window.cv);
      cvLoaded = true;
      checkDone();
    } else {
      const script = document.querySelector('script[src*="opencv.js"]');
      if (script) {
        script.onload = () => {
          if (window.cv) {
            setCv(window.cv);
            cvLoaded = true;
            checkDone();
          } else {
            setError('Failed to load CV library.');
          }
        };
      }
    }
  }, []);

  // פונקציית ציור כללית
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current.src || corners.length !== 4) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    const sorted = sortCorners(corners);
    const path = [sorted.tl, sorted.tr, sorted.br, sorted.bl];

    ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    corners.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
      ctx.fillStyle =
        draggingPointIndex === index ? 'rgba(255, 0, 0, 0.95)' : 'rgba(255, 0, 0, 0.65)';
      ctx.fill();
    });
  }, [corners, draggingPointIndex]);

  // אפקט ראשי: טוען תמונה ומפעיל זיהוי
  useEffect(() => {
    if (!imageSrc || !model || !cv) {
      if (imageSrc && (!model || !cv)) {
        setIsLoading(true);
        setLoadingText('Waiting for libraries to load...');
      }
      return;
    }

    setIsLoading(true);
    setLoadingText('Analyzing Document...');
    setError('');
    const img = imageRef.current;
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = async () => {
      const canvas = canvasRef.current;
      const MAX_DIMENSION = 1024;
      const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const predictions = await model.detect(img);
      console.log('AI Detections:', predictions);

      const docPrediction = predictions.find((p) => p.class === 'book');

      if (docPrediction) {
        console.log("Found a 'book' prediction, using its bounding box.");
        const [x, y, width, height] = docPrediction.bbox;
        setCorners([
          { x: x * scale, y: y * scale },
          { x: (x + width) * scale, y: y * scale },
          { x: (x + width) * scale, y: (y + height) * scale },
          { x: x * scale, y: (y + height) * scale },
        ]);
      } else {
        setError("Smart detection couldn't find a document. Please adjust manually.");
        const w = canvas.width,
          h = canvas.height;
        setCorners([
          { x: w * 0.15, y: h * 0.15 },
          { x: w * 0.85, y: h * 0.15 },
          { x: w * 0.85, y: h * 0.85 },
          { x: w * 0.15, y: h * 0.85 },
        ]);
      }
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      setError('Could not load the image.');
    };
  }, [imageSrc, model, cv]);

  useEffect(() => {
    draw();
  }, [corners, draw]);

  // --- לוגיקת גרירה ---
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    for (let i = 0; i < corners.length; i++) {
      if (Math.hypot(corners[i].x - pos.x, corners[i].y - pos.y) < 25) {
        setDraggingPointIndex(i);
        return;
      }
    }
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (draggingPointIndex === null) return;
    const pos = getMousePos(e);
    setCorners((prev) => prev.map((p, i) => (i === draggingPointIndex ? pos : p)));
  };

  const handleMouseUp = () => setDraggingPointIndex(null);

  // --- פונקציית החיתוך ---
  const handleCrop = () => {
    if (corners.length !== 4 || !cv) return;
    try {
      const originalWidth = imageRef.current.width;
      const scaleFactor = originalWidth / canvasRef.current.width;
      const sorted = sortCorners(corners);
      const scaledCorners = [sorted.tl, sorted.tr, sorted.br, sorted.bl].map((p) => ({
        x: p.x * scaleFactor,
        y: p.y * scaleFactor,
      }));
      const srcMat = cv.imread(imageRef.current);
      const widthA = Math.hypot(
        scaledCorners[2].x - scaledCorners[3].x,
        scaledCorners[2].y - scaledCorners[3].y
      );
      const widthB = Math.hypot(
        scaledCorners[1].x - scaledCorners[0].x,
        scaledCorners[1].y - scaledCorners[0].y
      );
      const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));
      const heightA = Math.hypot(
        scaledCorners[1].x - scaledCorners[2].x,
        scaledCorners[1].y - scaledCorners[2].y
      );
      const heightB = Math.hypot(
        scaledCorners[0].x - scaledCorners[3].x,
        scaledCorners[0].y - scaledCorners[3].y
      );
      const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));
      const dsize = new cv.Size(maxWidth, maxHeight);
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        scaledCorners[0].x,
        scaledCorners[0].y,
        scaledCorners[1].x,
        scaledCorners[1].y,
        scaledCorners[3].x,
        scaledCorners[3].y,
        scaledCorners[2].x,
        scaledCorners[2].y,
      ]);
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        maxWidth - 1,
        0,
        0,
        maxHeight - 1,
        maxWidth - 1,
        maxHeight - 1,
      ]);
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      let warpedMat = new cv.Mat();
      cv.warpPerspective(
        srcMat,
        warpedMat,
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );
      const tempCanvas = document.createElement('canvas');
      cv.imshow(tempCanvas, warpedMat);
      onProcessComplete(tempCanvas.toDataURL('image/jpeg'));
      srcMat.delete();
      M.delete();
      warpedMat.delete();
      srcTri.delete();
      dstTri.delete();
    } catch (err) {
      console.error('Error during cropping:', err);
      setError('Failed to crop the image. Please try again.');
    }
  };

  return (
    <div className="relative">
      {isLoading && <LoadingSpinner text={loadingText} />}
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          className={`w-full h-auto rounded-lg touch-none ${isLoading ? 'invisible' : 'visible'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />
      </div>
      {error && <p className="text-center text-orange-600 font-semibold mt-4">{error}</p>}
      {!isLoading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleCrop}
            disabled={corners.length !== 4}
            className="bg-green-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            Crop & Confirm
          </button>
        </div>
      )}
    </div>
  );
}

// פונקציית מיון הפינות המשופרת
function sortCorners(corners) {
  if (corners.length !== 4) return { tl: 0, tr: 0, br: 0, bl: 0 };
  const center = corners.reduce(
    (acc, p) => ({ x: acc.x + p.x / corners.length, y: acc.y + p.y / corners.length }),
    { x: 0, y: 0 }
  );
  let tl, tr, bl, br;
  corners.forEach((point) => {
    if (point.x < center.x && point.y < center.y) tl = point;
    else if (point.x > center.x && point.y < center.y) tr = point;
    else if (point.x < center.x && point.y > center.y) bl = point;
    else if (point.x > center.x && point.y > center.y) br = point;
  });
  if (!tl || !tr || !bl || !br) {
    corners.sort((a, b) => a.y - b.y);
    const top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);
    return { tl: top[0], tr: top[1], bl: bottom[0], br: bottom[1] };
  }
  return { tl, tr, br, bl };
}

export default DocumentScanner;
