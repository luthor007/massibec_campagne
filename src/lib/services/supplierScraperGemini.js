// src/lib/services/supplierScraperGemini.js
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from '../../utils/cloudinary';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scrape supplier website using Gemini Python script
 * @param {string} websiteUrl - The URL of the supplier website to scrape
 * @returns {Promise<Object>} - Scraped data with companyInfo and products
 */
export async function scrapeSupplierWebsiteGemini(websiteUrl) {
    try {
        console.log(`🔮 Starting Gemini scraping for: ${websiteUrl}`);
        console.log(`📁 Current working directory: ${process.cwd()}`);

        // Use the new modular scraper (python -m scraper.main)
        const scriptsDir = path.join(process.cwd(), 'scripts');
        const scraperModulePath = path.join(scriptsDir, 'scraper');
        const scraperMainPath = path.join(scraperModulePath, 'main.py');
        const scraperInitPath = path.join(scraperModulePath, '__init__.py');

        // Enhanced checks with detailed logging
        console.log(`🔍 Checking scraper paths:`);
        console.log(`  - scriptsDir: ${scriptsDir}`);
        console.log(`  - scraperModulePath: ${scraperModulePath}`);
        console.log(`  - scraperMainPath: ${scraperMainPath}`);
        console.log(`  - scriptsDir exists: ${fs.existsSync(scriptsDir)}`);
        console.log(`  - scraperModulePath exists: ${fs.existsSync(scraperModulePath)}`);
        console.log(`  - scraperMainPath exists: ${fs.existsSync(scraperMainPath)}`);
        console.log(`  - scraperInitPath exists: ${fs.existsSync(scraperInitPath)}`);

        // List contents of scripts directory if it exists
        if (fs.existsSync(scriptsDir)) {
            try {
                const scriptsContents = fs.readdirSync(scriptsDir);
                console.log(`  - scriptsDir contents: ${scriptsContents.join(', ')}`);
            } catch (err) {
                console.warn(`  - Could not read scriptsDir: ${err.message}`);
            }
        }

        // List contents of scraper directory if it exists
        if (fs.existsSync(scraperModulePath)) {
            try {
                const scraperContents = fs.readdirSync(scraperModulePath);
                console.log(`  - scraperModulePath contents: ${scraperContents.join(', ')}`);
            } catch (err) {
                console.warn(`  - Could not read scraperModulePath: ${err.message}`);
            }
        }

        // Check if scraper module exists with detailed error
        if (!fs.existsSync(scriptsDir)) {
            throw new Error(`Scripts directory not found at: ${scriptsDir}. Current working directory: ${process.cwd()}`);
        }

        if (!fs.existsSync(scraperModulePath)) {
            throw new Error(`Scraper module directory not found at: ${scraperModulePath}. Scripts directory exists: ${fs.existsSync(scriptsDir)}, contents: ${fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir).join(', ') : 'N/A'}`);
        }

        if (!fs.existsSync(scraperMainPath)) {
            throw new Error(`Scraper main.py not found at: ${scraperMainPath}. Scraper directory exists: ${fs.existsSync(scraperModulePath)}, contents: ${fs.existsSync(scraperModulePath) ? fs.readdirSync(scraperModulePath).join(', ') : 'N/A'}`);
        }

        if (!fs.existsSync(scraperInitPath)) {
            throw new Error(`Scraper __init__.py not found at: ${scraperInitPath}`);
        }

        console.log(`✅ All scraper files found, proceeding with execution`);

        // Run the modular scraper
        const { stdout, stderr } = await execAsync(
            `python3 -m scraper.main "${websiteUrl}"`,
            {
                cwd: scriptsDir, // Run from scripts directory
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
                }
            }
        );

        // Check for errors in stderr (Python warnings might go here)
        if (stderr && !stderr.includes('WARNING')) {
            console.warn('Python stderr:', stderr);
        }

        // The script saves results to scraped_data.json (in scripts directory or project root)
        // Try scripts directory first (new modular scraper), then project root (fallback)
        let outputFile = path.join(scriptsDir, 'scraped_data.json');
        if (!fs.existsSync(outputFile)) {
            // Fallback to project root (for backward compatibility)
            outputFile = path.join(process.cwd(), 'scraped_data.json');
        }

        if (!fs.existsSync(outputFile)) {
            throw new Error('Scraped data file not found. The Python script may have failed.');
        }

        // Read the scraped data
        const scrapedData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

        console.log(`✅ Gemini scraping completed: ${scrapedData.products?.length || 0} products found`);

        // Process images: upload from assets/scraped-images to Cloudinary
        const assetsDir = path.join(process.cwd(), 'assets', 'scraped-images');

        // Helper function to upload image to Cloudinary from local file
        const uploadImageToCloudinary = async (imagePath, folder = 'products') => {
            try {
                if (!fs.existsSync(imagePath)) {
                    return null;
                }

                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

                const uploadResult = await cloudinary.uploader.upload(
                    `data:${mimeType};base64,${base64Image}`,
                    {
                        folder: folder,
                        resource_type: 'image',
                        transformation: [
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
                    }
                );

                return uploadResult.secure_url;
            } catch (error) {
                console.error(`Error uploading image to Cloudinary: ${imagePath}`, error);
                return null;
            }
        };

        // Helper function to upload image from URL to Cloudinary
        const uploadImageUrlToCloudinary = async (imageUrl, folder = 'products') => {
            try {
                if (!imageUrl || !imageUrl.startsWith('http')) {
                    return null;
                }

                // Upload directly from URL
                const uploadResult = await cloudinary.uploader.upload(imageUrl, {
                    folder: folder,
                    resource_type: 'image',
                    transformation: [
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                });

                return uploadResult.secure_url;
            } catch (error) {
                console.error(`Error uploading image URL to Cloudinary: ${imageUrl}`, error);
                return null;
            }
        };

        // Upload company logo if exists
        if (scrapedData.companyInfo?.logo) {
            const logoPath = scrapedData.companyInfo.logo;
            // If it's a URL, upload to Cloudinary
            if (logoPath.startsWith('http')) {
                const cloudinaryUrl = await uploadImageUrlToCloudinary(logoPath, 'supplier-logos');
                if (cloudinaryUrl) {
                    scrapedData.companyInfo.logo = cloudinaryUrl;
                    console.log(`📸 Logo URL uploaded to Cloudinary: ${cloudinaryUrl}`);
                } else {
                    console.warn(`⚠️ Failed to upload logo URL to Cloudinary: ${logoPath}`);
                    // Keep original URL if upload fails
                }
            } else if (!logoPath.startsWith('/uploads')) {
                // Check if it's a relative path (from assets/scraped-images)
                // Try different possible paths
                let sourceLogoPath = null;

                // Normalize path: handle relative paths
                let normalizedLogoPath = logoPath;
                if (normalizedLogoPath.startsWith('../')) {
                    normalizedLogoPath = normalizedLogoPath.replace(/^\.\.\//, '');
                } else if (normalizedLogoPath.startsWith('./')) {
                    normalizedLogoPath = normalizedLogoPath.replace(/^\.\//, '');
                }

                // Path relative to project root (assets/scraped-images/filename)
                if (normalizedLogoPath.includes('assets') || normalizedLogoPath.includes('scraped-images')) {
                    sourceLogoPath = path.join(process.cwd(), normalizedLogoPath);
                } else {
                    // Just filename, assume it's in assets/scraped-images
                    sourceLogoPath = path.join(assetsDir, path.basename(normalizedLogoPath));
                }

                // Also try direct path from assets/scraped-images
                if (!fs.existsSync(sourceLogoPath)) {
                    sourceLogoPath = path.join(assetsDir, path.basename(normalizedLogoPath));
                }

                if (fs.existsSync(sourceLogoPath)) {
                    const cloudinaryUrl = await uploadImageToCloudinary(sourceLogoPath, 'supplier-logos');
                    if (cloudinaryUrl) {
                        scrapedData.companyInfo.logo = cloudinaryUrl;
                        console.log(`📸 Logo uploaded to Cloudinary: ${cloudinaryUrl}`);
                    } else {
                        console.warn(`⚠️ Failed to upload logo to Cloudinary: ${sourceLogoPath}`);
                    }
                } else {
                    console.warn(`⚠️ Logo file not found: ${sourceLogoPath}`);
                }
            }
        }

        // Upload product images to Cloudinary
        if (scrapedData.products && scrapedData.products.length > 0) {
            for (const product of scrapedData.products) {
                // Upload main product image
                if (product.image) {
                    // If it's a URL, upload to Cloudinary
                    if (product.image.startsWith('http')) {
                        const cloudinaryUrl = await uploadImageUrlToCloudinary(product.image, 'products');
                        if (cloudinaryUrl) {
                            product.image = cloudinaryUrl;
                            console.log(`📸 Product image URL uploaded to Cloudinary`);
                        } else {
                            console.warn(`⚠️ Failed to upload product image URL to Cloudinary: ${product.image}`);
                            // Keep original URL if upload fails
                        }
                    } else if (!product.image.startsWith('/uploads')) {
                        // Local file path
                        let sourceImagePath = null;

                        // Normalize path: handle relative paths like ../assets/scraped-images/file.jpg
                        let normalizedImagePath = product.image;
                        if (normalizedImagePath.startsWith('../')) {
                            // Remove ../ prefix and resolve from project root
                            normalizedImagePath = normalizedImagePath.replace(/^\.\.\//, '');
                        } else if (normalizedImagePath.startsWith('./')) {
                            normalizedImagePath = normalizedImagePath.replace(/^\.\//, '');
                        }

                        // Try different possible paths
                        if (normalizedImagePath.includes('assets') || normalizedImagePath.includes('scraped-images')) {
                            // Path already includes assets/scraped-images
                            sourceImagePath = path.join(process.cwd(), normalizedImagePath);
                        } else {
                            // Just filename, assume it's in assets/scraped-images
                            sourceImagePath = path.join(assetsDir, path.basename(normalizedImagePath));
                        }

                        if (fs.existsSync(sourceImagePath)) {
                            const cloudinaryUrl = await uploadImageToCloudinary(sourceImagePath, 'products');
                            if (cloudinaryUrl) {
                                product.image = cloudinaryUrl;
                                console.log(`📸 Product image uploaded to Cloudinary: ${path.basename(sourceImagePath)}`);
                            } else {
                                console.warn(`⚠️ Failed to upload product image to Cloudinary: ${sourceImagePath}`);
                            }
                        } else {
                            console.warn(`⚠️ Product image not found: ${sourceImagePath} (original: ${product.image})`);
                        }
                    }
                }

                // Upload ingredients and nutrition images if they exist
                for (const imageField of ['ingredientsImage', 'nutritionImage']) {
                    if (product[imageField]) {
                        // If it's a URL, upload to Cloudinary
                        if (product[imageField].startsWith('http')) {
                            const cloudinaryUrl = await uploadImageUrlToCloudinary(product[imageField], 'product-details');
                            if (cloudinaryUrl) {
                                product[imageField] = cloudinaryUrl;
                            }
                        } else if (!product[imageField].startsWith('/uploads')) {
                            // Local file path
                            let sourceImagePath = null;

                            // Normalize path: handle relative paths
                            let normalizedImagePath = product[imageField];
                            if (normalizedImagePath.startsWith('../')) {
                                normalizedImagePath = normalizedImagePath.replace(/^\.\.\//, '');
                            } else if (normalizedImagePath.startsWith('./')) {
                                normalizedImagePath = normalizedImagePath.replace(/^\.\//, '');
                            }

                            if (normalizedImagePath.includes('assets') || normalizedImagePath.includes('scraped-images')) {
                                sourceImagePath = path.join(process.cwd(), normalizedImagePath);
                            } else {
                                sourceImagePath = path.join(assetsDir, path.basename(normalizedImagePath));
                            }

                            if (fs.existsSync(sourceImagePath)) {
                                const cloudinaryUrl = await uploadImageToCloudinary(sourceImagePath, 'product-details');
                                if (cloudinaryUrl) {
                                    product[imageField] = cloudinaryUrl;
                                }
                            }
                        }
                    }
                }
            }
        }

        return scrapedData;

    } catch (error) {
        console.error('Error in scrapeSupplierWebsiteGemini:', error);
        throw new Error(`Erreur lors du scraping Gemini: ${error.message}`);
    }
}
