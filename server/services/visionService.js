// server/services/visionService.js
const vision = require('@google-cloud/vision');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const client = new vision.ImageAnnotatorClient();

function buildExtractionRegion(page) {
    if (!page.blocks || page.blocks.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    page.blocks.forEach(block => {
        if (block.boundingBox && block.boundingBox.vertices) {
            block.boundingBox.vertices.forEach(vertex => {
                minX = Math.min(minX, vertex.x || 0);
                minY = Math.min(minY, vertex.y || 0);
                maxX = Math.max(maxX, vertex.x || 0);
                maxY = Math.max(maxY, vertex.y || 0);
            });
        }
    });
    if (maxX === -1) return null;
    return {
        left: Math.floor(minX),
        top: Math.floor(minY),
        width: Math.ceil(maxX - minX),
        height: Math.ceil(maxY - minY)
    };
}

async function processAndCropImage(imagePath) {
    try {
        console.log(`[Vision Service] Stage 1: Sending to Google Vision API...`);
        const [result] = await client.documentTextDetection(imagePath);
        
        const fullTextAnnotation = result.fullTextAnnotation;
        if (!fullTextAnnotation || !fullTextAnnotation.pages || fullTextAnnotation.pages.length === 0) {
            throw new Error("Vision API did not detect any pages.");
        }
        
        const page = fullTextAnnotation.pages[0];
        const extractedText = fullTextAnnotation.text || '';
        
        const outputDir = path.join(path.dirname(imagePath), '../processed');
        await fs.mkdir(outputDir, { recursive: true });

        const region = buildExtractionRegion(page);

        if (!region || region.width <= 0 || region.height <= 0) {
            console.error("[Vision Service] Could not determine a valid extraction region. Using original image.");
            return { extractedText, croppedImagePath: imagePath };
        }
        
        console.log(`[Vision Service] Stage 2: Performing coarse crop based on text bounds...`);
        
        // חותכים חיתוך גס לפי גבולות הטקסט
        const coarseCroppedBuffer = await sharp(imagePath)
            .extract(region)
            .toBuffer();

        console.log(`[Vision Service] Stage 3: Trimming black borders from the cropped image...`);

        const outputFilename = `processed-${path.basename(imagePath)}`;
        const outputPath = path.join(outputDir, outputFilename);
        
        // לוקחים את התמונה החתוכה הגסה ומסירים ממנה את השוליים השחורים
        await sharp(coarseCroppedBuffer)
            .trim({ 
                // threshold קובע כמה דומה צבע צריך להיות לצבע הרקע כדי להיחתך.
                // ערך גבוה יותר (למשל 50) יסיר גם גוונים של אפור כהה.
                // נתחיל עם ערך נמוך-בינוני.
                threshold: 30 
            })
            .toFile(outputPath);
            
        console.log(`[Vision Service] Stage 4: Final image saved to: ${outputPath}`);

        return {
            extractedText,
            croppedImagePath: outputPath
        };

    } catch (error) {
        console.error("[Vision Service] An error occurred during image processing:", error);
        throw new Error(`Vision Service failed: ${error.message}`);
    }
}

module.exports = { processAndCropImage };