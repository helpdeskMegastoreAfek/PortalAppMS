const vision = require('@google-cloud/vision');
const sharp = require('sharp'); // ייבוא של sharp
const fs = require('fs').promises;
const path = require('path');

const client = new vision.ImageAnnotatorClient();

async function processAndCropImage(imagePath) {
    try {
        console.log(`[Vision Service] Sending ${path.basename(imagePath)} to Google Vision API...`);
        const [result] = await client.documentTextDetection(imagePath);
        const fullTextAnnotation = result.fullTextAnnotation;
        if (!fullTextAnnotation || !fullTextAnnotation.pages.length) {
            throw new Error("No document detected by Google Vision API.");
        }
        console.log("[Vision Service] Google Vision API responded.");
        const extractedText = fullTextAnnotation.text;
        
        // 1. קבלת הפינות מגוגל
        const vertices = fullTextAnnotation.pages[0].blocks[0].boundingBox.vertices;
        
        // 2. חישוב המלבן החוסם (Bounding Box)
        const left = Math.min(...vertices.map(v => v.x));
        const top = Math.min(...vertices.map(v => v.y));
        const right = Math.max(...vertices.map(v => v.x));
        const bottom = Math.max(...vertices.map(v => v.y));

        const width = Math.round(right - left);
        const height = Math.round(bottom - top);

        // 3. חיתוך התמונה באמצעות sharp
        const outputDir = path.join(path.dirname(imagePath), '../processed');
        await fs.mkdir(outputDir, { recursive: true });
        const outputFilename = `processed-${path.basename(imagePath)}`;
        const outputPath = path.join(outputDir, outputFilename);

        await sharp(imagePath)
            .extract({ left: Math.round(left), top: Math.round(top), width: width, height: height })
            .toFile(outputPath);

        console.log(`[Vision Service] Cropped (rectangular) image saved to: ${outputPath}`);

        return {
            extractedText,
            processedImagePath: outputPath
        };
    } catch (error) {
        console.error("[Vision Service] Error:", error);
        throw new Error("Failed during Google Vision processing and cropping.");
    }
}

module.exports = { processAndCropImage };