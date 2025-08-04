import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// רכיב Spinner לתקופת הטעינה
const LoadingSpinner = ({ message }) => (
  <div className="absolute inset-0 bg-white bg-opacity-85 flex flex-col items-center justify-center rounded-lg z-30">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    <p className="mt-4 text-indigo-600 font-semibold text-center px-4">{message}</p>
  </div>
);

// רכיב המצלמה הראשי
function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const cvRef = useRef(null); // רפרנס ל-OpenCV
  const stabilityCounter = useRef(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isReady, setIsReady] = useState(false);

  // פונקציית העיבוד המדויק עם OpenCV (הגאון האיטי)
  const processImageWithOpenCV = useCallback(
    (imageCanvas) => {
      const cv = cvRef.current;
      if (!cv) {
        console.warn('OpenCV not ready, sending uncropped image.');
        onCapture(imageCanvas.toDataURL('image/jpeg'));
        return;
      }

      try {
        let src = cv.imread(imageCanvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        let edged = new cv.Mat();
        cv.Canny(blurred, edged, 50, 150);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let docContour = null;
        for (let i = 0; i < contours.size(); ++i) {
          let cnt = contours.get(i);
          let area = cv.contourArea(cnt);
          if (area > 10000) {
            let peri = cv.arcLength(cnt, true);
            let approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
            if (approx.rows === 4 && area > maxArea) {
              maxArea = area;
              docContour = approx.clone();
            }
            approx.delete();
          }
          cnt.delete();
        }

        if (!docContour) {
          throw new Error("OpenCV couldn't find precise corners.");
        }

        const corners = [];
        for (let i = 0; i < docContour.data32S.length; i += 2)
          corners.push({ x: docContour.data32S[i], y: docContour.data32S[i + 1] });
        corners.sort((a, b) => a.y - b.y);
        let topCorners = corners.slice(0, 2).sort((a, b) => a.x - b.x);
        let bottomCorners = corners.slice(2, 4).sort((a, b) => a.x - b.x);
        const [tl, tr, bl, br] = [topCorners[0], topCorners[1], bottomCorners[0], bottomCorners[1]];

        const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
        const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));
        const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
        const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
        const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));

        if (maxWidth <= 0 || maxHeight <= 0) throw new Error('Invalid crop dimensions.');

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          tl.x,
          tl.y,
          tr.x,
          tr.y,
          bl.x,
          bl.y,
          br.x,
          br.y,
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
        cv.warpPerspective(src, warpedMat, M, new cv.Size(maxWidth, maxHeight));

        const resultCanvas = document.createElement('canvas');
        cv.imshow(resultCanvas, warpedMat);
        onCapture(resultCanvas.toDataURL('image/jpeg'));

        src.delete();
        gray.delete();
        blurred.delete();
        edged.delete();
        contours.delete();
        hierarchy.delete();
        docContour.delete();
        M.delete();
        warpedMat.delete();
        srcTri.delete();
        dstTri.delete();
      } catch (error) {
        console.warn('Precise crop failed, sending uncropped image:', error);
        onCapture(imageCanvas.toDataURL('image/jpeg'));
      }
    },
    [onCapture]
  );

  // לולאת זיהוי מהירה עם AI (העובד המהיר)
  const detectLoop = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !videoRef.current.srcObject || isCapturing)
      return;

    const predictions = await modelRef.current.detect(videoRef.current);
    const bookPrediction = predictions.find((p) => p.class === 'book' && p.score > 0.65);

    if (bookPrediction) {
      stabilityCounter.current += 1;
      const STABILITY_THRESHOLD = 15;
      if (stabilityCounter.current > STABILITY_THRESHOLD) {
        setIsCapturing(true);

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        if (video.srcObject) {
          video.srcObject.getTracks().forEach((track) => track.stop());
        }

        processImageWithOpenCV(canvas);
        return;
      }
    } else {
      stabilityCounter.current = 0;
    }

    requestAnimationFrame(detectLoop);
  }, [isCapturing, processImageWithOpenCV]);

  // אפקט ראשי לאתחול, כולל הפעלת הלולאה
  useEffect(() => {
    let isActive = true;
    async function initialize() {
      try {
        setLoadingMessage('Loading AI Model...');
        const model = await cocoSsd.load();
        if (!isActive) return;
        modelRef.current = model;

        setLoadingMessage('Loading CV Library...');
        if (!window.cv) {
          const script = document.createElement('script');
          script.src = 'https://docs.opencv.org/4.x/opencv.js';
          script.async = true;
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }
        if (!isActive) return;
        cvRef.current = window.cv;

        setLoadingMessage('Starting Camera...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 1280, height: 720 },
        });

        if (!isActive || !videoRef.current) return;
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve) => {
          videoRef.current.onloadeddata = resolve;
        });

        setLoadingMessage(null);
        setIsReady(true);
        detectLoop(); // הפעלת הלולאה כאן
      } catch (err) {
        if (isActive) {
          console.error('Initialization failed:', err);
          setLoadingMessage(`Error: ${err.name}.`);
        }
      }
    }
    initialize();

    return () => {
      isActive = false;
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [detectLoop]); // התלות הנכונה

  return (
    <div className="relative w-full h-[80vh] bg-black rounded-lg">
      {!isReady && <LoadingSpinner message={loadingMessage} />}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      />
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
