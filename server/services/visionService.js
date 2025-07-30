const vision = require('@google-cloud/vision');
const cv = require('opencv4nodejs');
const fs = require('fs').promises;
const path = require('path');

const client = new vision.ImageAnnotatorClient();

async function processAndCropImage(imagePath) {
    try {
        console.log(`[Vision Service] Sending ${imagePath} to Google Vision API...`);
        const [result] = await client.documentTextDetection(imagePath);
        const fullTextAnnotation = result.fullTextAnnotation;
        if (!fullTextAnnotation || !fullTextAnnotation.pages.length) {
            throw new Error("No document detected by Google Vision API.");
        }
        console.log("[Vision Service] Google Vision API responded.");
        const extractedText = fullTextAnnotation.text;
        const vertices = fullTextAnnotation.pages[0].blocks[0].boundingBox.vertices;
        const corners = vertices.map(v => new cv.Point2(v.x, v.y));
        const originalImage = await cv.imreadAsync(imagePath);
        const width = Math.max(
            Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y),
            Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y)
        );
        const height = Math.max(
            Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y),
            Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y)
        );
        const targetCorners = [
            new cv.Point2(0, 0),
            new cv.Point2(width - 1, 0),
            new cv.Point2(width - 1, height - 1),
            new cv.Point2(0, height - 1)
        ];
        const transform = cv.getPerspectiveTransform(corners, targetCorners);
        const warpedImage = await originalImage.warpPerspectiveAsync(transform, new cv.Size(width, height));
        const outputDir = path.join(path.dirname(imagePath), '../processed');
        await fs.mkdir(outputDir, { recursive: true });
        const outputFilename = `cropped-${path.basename(imagePath)}`;
        const outputPath = path.join(outputDir, outputFilename);
        await cv.imwriteAsync(outputPath, warpedImage);
        console.log(`[Vision Service] Cropped image saved to ${outputPath}`);
        return {
            extractedText,
            croppedImagePath: outputPath
        };
    } catch (error) {
        console.error("[Vision Service] Error:", error);
        throw new Error("Failed during Google Vision processing.");
    }
}

module.exports = { processAndCropImage };