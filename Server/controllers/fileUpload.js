const File=require("../models/File");
const cloudinary=require("cloudinary").v2;
exports.localFileUpload = async (req, res) => {
    console.log("localFileUpload endpoint hit");
    try{
        // Check if files exist in request
        if (!req.files || !req.files.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const file = req.files.file;
        console.log("File reached",file);
        
        // Extract file extension safely
        const fileName = file.name || 'file';
        const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
        let path = __dirname + "/files/" + Date.now() + "." + fileExtension;
        console.log(path);
        file.mv(path, async (err) => {
            if (err) {
                console.error("File move error:", err);
                return res.status(500).json({
                    success: false,
                    message: "File upload failed",
                    error: err.message
                });
            }

            // Save file info to MongoDB and trigger email
            try {
                // Get additional fields from request body (form-data)
                const { name, tags, email } = req.body;
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: "Email is required to send notification"
                    });
                }
                const fileDoc = new File({
                    Name: name || fileName,
                    imageUrl: path,
                    tags: tags || '',
                    email: email
                });
                await fileDoc.save();
                // Debug log for email notification
                console.log("File uploaded, document saved. Email notification should be triggered by Mongoose post-save hook.");
                res.json({
                    success: true,
                    message: "File uploaded and email notification attempted. Check server logs for email status."
                });
            } catch (dbErr) {
                console.error("Error saving file info:", dbErr);
                res.status(500).json({
                    success: false,
                    message: "File uploaded but failed to save info/send email",
                    error: dbErr.message
                });
            }
        });
    }
    catch(error){
        console.error("File upload error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}
function isFileTypeSupported(fileType) {
    const supportedTypes = {"jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif"};
    return supportedTypes[fileType] !== undefined;
}
async function uploadFileToCloudinary(file, folder, resourceType = "auto"){
    const options = {
        folder: folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: false,
        overwrite: true
    };
    
    console.log("Uploading to Cloudinary with options:", options);
    console.log("File details:", {
        name: file.name,
        size: file.size,
        mimetype: file.mimetype
    });
    
    try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, options);
        console.log("Upload successful! Public ID:", result.public_id);
        console.log("Secure URL:", result.secure_url);
        return result;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw error;
    }
}

//image upload endpoint
exports.imageUpload = async (req, res) => {
    try{
        // Check if files exist in request
        if (!req.files || !req.files.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const file=req.files.file;
        console.log(file);

        // Check if file has extension
        if (!file.name || !file.name.includes('.')) {
            return res.status(400).json({
                success: false,
                message: "File must have a valid extension"
            });
        }

        // Extract file extension more safely
        const fileName = file.name.toLowerCase();
        const fileType = fileName.split('.').pop(); // Get last part after dot
        console.log("File name:", file.name);
        console.log("Extracted file type:", fileType);

        // Check supported file types
        const supportedTypes = ["jpeg", "jpg", "png", "gif"];
        if (!supportedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported file type: ${fileType}. Only jpeg, jpg, png, gif are allowed.`
            });
        }

        //supported hai
        const response = await uploadFileToCloudinary(file, "CompressX", "image");
        console.log("File uploaded to Cloudinary:", response);
        
        res.json({
            success: true,
            message: "Image uploaded successfully to Cloudinary",
            imageUrl: response.secure_url,
            data: response
        });

    }
    catch(error){
        console.error("Image upload error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

//video upload
exports.videoUpload = async (req, res) => {
    try{
        // Check if files exist in request - accept both 'file' and 'videofile'
        if (!req.files || (!req.files.videofile && !req.files.file)) {
            return res.status(400).json({
                success: false,
                message: "No video file uploaded. Use 'file' or 'videofile' as the field name."
            });
        }

        // Accept either 'videofile' or 'file' as field name
        const file = req.files.videofile || req.files.file;
        console.log("Video file details:", {
            name: file.name,
            size: file.size,
            mimetype: file.mimetype
        });

        // Check if file has extension
        if (!file.name || !file.name.includes('.')) {
            return res.status(400).json({
                success: false,
                message: "File must have a valid extension"
            });
        }

        // Extract file extension more safely
        const fileName = file.name.toLowerCase();
        const fileType = fileName.split('.').pop(); // Get last part after dot
        console.log("File name:", file.name);
        console.log("Extracted file type:", fileType);

        // Check supported file types
        const supportedTypes = ["mp4", "mkv", "avi", "mov", "wmv"];
        if (!supportedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported file type: ${fileType}. Only mp4, mkv, avi, mov, wmv are allowed.`
            });
        }

        //Upload video to Cloudinary
        console.log("Starting video upload to Cloudinary folder: CompressX");
        const response = await uploadFileToCloudinary(file, "CompressX", "video");
        console.log("Video successfully uploaded to Cloudinary!");

        res.json({
            success: true,
            message: "Video uploaded successfully to Cloudinary",
            videoUrl: response.secure_url,
            data: response
        });

    }
    catch(error){
        console.error("Video upload error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

//image reducer upload - compresses image before uploading
exports.imageReducerUpload = async (req, res) => {
    try{
        // Check if files exist in request
        if (!req.files || !req.files.file) {
            return res.status(400).json({
                success: false,
                message: "No image file uploaded"
            });
        }

        const { name, tags, email } = req.body;
        console.log("Image reducer upload data:", {name, tags, email});
        const file = req.files.file;
        console.log("Image file details:", {
            name: file.name,
            size: file.size,
            mimetype: file.mimetype
        });

        // Check if file has extension
        if (!file.name || !file.name.includes('.')) {
            return res.status(400).json({
                success: false,
                message: "File must have a valid extension"
            });
        }

        // Extract file extension more safely
        const fileName = file.name.toLowerCase();
        const fileType = fileName.split('.').pop();
        console.log("File name:", file.name);
        console.log("Extracted file type:", fileType);

        // Check supported file types
        const supportedTypes = ["jpeg", "jpg", "png", "gif"];
        if (!supportedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported file type: ${fileType}. Only jpeg, jpg, png, gif are allowed.`
            });
        }

        //Upload image with compression/reduction settings
        console.log("Starting compressed image upload to Cloudinary folder: Codehelp");
        const options = {
            folder: "Codehelp",
            resource_type: "image",
            use_filename: true,
            unique_filename: false,
            overwrite: true,
            // Image compression/reduction settings
            quality: "auto:low", // Automatic quality optimization (lower file size)
            fetch_format: "auto", // Automatic format optimization
            width: 800, // Resize to max width of 800px
            height: 600, // Resize to max height of 600px
            crop: "limit" // Only resize if image is larger than specified dimensions
        };
        
        const response = await cloudinary.uploader.upload(file.tempFilePath, options);
        console.log("Compressed image successfully uploaded to Cloudinary!");
        console.log("Original size vs compressed:", {
            originalSize: file.size,
            compressedUrl: response.secure_url,
            publicId: response.public_id
        });
        
        // Save file info to database and trigger email if needed
        if (email) {
            const fileData = new File({
                Name: name || file.name,
                imageUrl: response.secure_url,
                tags: tags || '',
                email: email
            });
            await fileData.save();
        }

        res.json({
            success: true,
            message: "Image compressed and uploaded successfully to Cloudinary",
            imageUrl: response.secure_url,
            originalSize: file.size,
            compressedSize: response.bytes,
            data: response
        });

    }
    catch(error){
        console.error("Image reducer upload error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}