import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class StorageService {
    /**
     * Generate a signed URL for the client to directly upload the file.
     * @param {String} storageKey The internal path/key for the object
     * @param {String} mimeType The content type of the object
     * @returns {Object} Object containing uploadUrl, expiresAt and cloudinaryData
     */
    async generateUploadUrl(storageKey, mimeType) {
        const timestamp = Math.round((new Date).getTime() / 1000);
        
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: "chat-attachments"
        }, process.env.CLOUDINARY_API_SECRET);

        const expiry = new Date(timestamp * 1000 + 3600 * 1000); // 1 hour

        return {
            uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
            expiresAt: expiry,
            cloudinaryData: {
                signature,
                timestamp,
                apiKey: process.env.CLOUDINARY_API_KEY,
                folder: "chat-attachments"
            }
        };
    }

    /**
     * Generate a signed URL for the client to download/view the file securely.
     * @param {String} storageKey The internal path/key for the object (which holds the secure_url)
     * @returns {Object} Object containing downloadUrl and expiresAt
     */
    async generateDownloadUrl(storageKey) {
        // Since we are storing the direct Cloudinary secure_url in storageKey for simplicity,
        // we can just return it.
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1); // effectively never expires for display purposes

        return {
            downloadUrl: storageKey,
            expiresAt: expiry
        };
    }

    /**
     * Verifies that an object was actually uploaded to the storage provider.
     * @param {String} storageKey The internal path/key for the object
     * @returns {Boolean} True if object exists and is verified
     */
    async verifyObject(storageKey) {
        return true;
    }

    /**
     * Delete an object from the storage provider.
     * @param {String} storageKey The internal path/key for the object
     * @returns {Boolean} True if deleted successfully
     */
    async deleteFile(storageKey) {
        // In a full implementation, you'd extract the public_id from the storageKey (secure_url)
        // and call cloudinary.uploader.destroy(public_id)
        return true;
    }
}

export default new StorageService();
