const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Function to process all images in a folder
async function processImages(inputFolder, outputFolder, size, cornerRadius) {
    try {
        // Ensure the output folder exists
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }

        // Read all files in the input folder
        const files = fs.readdirSync(inputFolder);

        // Process each image
        for (const file of files) {
            const inputPath = path.join(inputFolder, file);
            const outputPath = path.join(outputFolder, file.replace('.jpg', '.png'));

            // Skip non-image files
            if (!/\.(jpg|jpeg|png)$/i.test(file)) {
                console.log(`Skipping non-image file: ${file}`);
                continue;
            }

            try {
                // Resize and apply rounded corners
                const resizedImage = await sharp(inputPath)
                    .resize(size, size, { fit: 'cover' })
                    .toBuffer();

                const svg = `
                    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
                    </svg>
                `;

                await sharp(resizedImage)
                    .composite([
                        {
                            input: Buffer.from(svg),
                            blend: 'dest-in', // Keeps only the intersection with the mask
                        },
                    ])
                    .toFile(outputPath);

                console.log(`Processed: ${file}`);
            } catch (imageError) {
                console.error(`Error processing ${file}:`, imageError);
            }
        }

        console.log(`All images processed. Output saved to: ${outputFolder}`);
    } catch (error) {
        console.error('Error reading folder or processing images:', error);
    }
}

// Example usage
const inputFolder = './img/wiki'; // Replace with your input folder path
const outputFolder = 'output'; // Replace with your desired output folder path
const size = 50; // Desired square size
const cornerRadius = 25; // Corner radius

processImages(inputFolder, outputFolder, size, cornerRadius);
