const tesseract = require("node-tesseract-ocr");
const path = require("path");

const config = {
  lang: "heb+eng", 
  oem: 1,          
  psm: 6,          
                   
};

/**
 * 
 * @param {string} imagePath
 * @returns {Promise<string>} 
 */
async function processImage(imagePath) {
  try {
    console.log(`[OCR Service] Starting OCR process for: ${imagePath}`);
    
    const text = await tesseract.recognize(imagePath, config);
    
    console.log("[OCR Service] OCR process completed successfully.");
    
    return text;
  } catch (error) {
    console.error("[OCR Service] Error during OCR process:", error.message);
    throw new Error("Failed to process image with OCR.");
  }
}

module.exports = {
  processImage,
};