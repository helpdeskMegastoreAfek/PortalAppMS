import React, { useState, useRef } from 'react';
import DocumentScanner from '../apps/DocumentScanner';
import Sidebar from './Sidebar';
import Header from './Header';

const UploadIcon = () => (
  <svg
    className="w-12 h-12 mx-auto text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

function InvoiceUploader() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedImage, setSelectedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setCroppedImage(null);
        setUploadStatus('idle');
        setStatusMessage('');
      };
      reader.readAsDataURL(file);
    } else {
      setUploadStatus('error');
      setStatusMessage('Please select a valid image file (JPG, PNG).');
    }
  };

  const handleProcessingComplete = (croppedDataUrl) => {
    setCroppedImage(croppedDataUrl);
    setSelectedImage(null);
  };

  const handleUpload = async () => {
    if (!croppedImage) {
      setStatusMessage('No cropped image to upload.');
      setUploadStatus('error');
      return;
    }
    setUploadStatus('uploading');
    setStatusMessage('Uploading cropped image...');
    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const fileToUpload = new File([blob], 'cropped_invoice.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('invoiceImage', fileToUpload);

      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'An unknown server error occurred.');
      }

      setUploadStatus('success');
      setStatusMessage(result.message);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setStatusMessage(error.message);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setUploadStatus('idle');
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusClasses = () => {
    switch (uploadStatus) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'hidden';
    }
  };

  return (
    <>
      <Header user={user} />
      <Sidebar user={user} />
      <div className="bg-slate-100 min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 transition-all duration-300">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Scan & Upload Invoice
            </h2>
            <p className="mt-2 text-md text-gray-500">
              Let's get your invoice ready for processing.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!selectedImage && !croppedImage && (
            <div
              onClick={() => fileInputRef.current.click()}
              className="relative block w-full border-2 border-dashed border-gray-300 rounded-xl p-10 sm:p-12 text-center hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-all duration-300 group"
            >
              <UploadIcon />
              <span className="mt-4 block text-lg font-semibold text-gray-800 group-hover:text-indigo-600">
                Click to upload or take a photo
              </span>
              <span className="mt-1 block text-sm text-gray-500">Supports: PNG, JPG</span>
            </div>
          )}

          {selectedImage && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center text-gray-800">Crop the Document</h3>
              <p className="text-center text-sm text-gray-500 -mt-2">
                The system will try to auto-detect the edges.
              </p>
              <div className="bg-gray-200 p-2 rounded-lg">
                <DocumentScanner
                  imageSrc={selectedImage}
                  onProcessComplete={handleProcessingComplete}
                />
              </div>
            </div>
          )}

          {croppedImage && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-xl font-bold text-green-600">Image Ready!</h3>
                <p className="text-gray-500">Here is the cropped and cleaned result.</p>
              </div>
              <div className="p-2 border bg-gray-50 rounded-lg">
                <img
                  src={croppedImage}
                  alt="Cropped preview"
                  className="mx-auto max-h-[50vh] rounded-md shadow-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading'}
                  className="w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Confirm & Upload'}
                </button>
                <button
                  onClick={handleClear}
                  className="w-full flex items-center justify-center bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}

          <div
            className={`p-4 rounded-lg text-center font-medium transition-all duration-300 ${getStatusClasses()}`}
          >
            {statusMessage}
          </div>
        </div>
      </div>
    </>
  );
}

export default InvoiceUploader;
