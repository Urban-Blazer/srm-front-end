<?php

header('Content-Type: application/json');

// Configuration
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB maximum file size

// orverwrite cors open to all
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");


// Allowed image types and extensions (JPEG, PNG, GIF, and WEBP)
$allowedTypes = [
    IMAGETYPE_JPEG,
    IMAGETYPE_PNG,
    IMAGETYPE_GIF,
    IMAGETYPE_WEBP
];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Check if request method is POST and an image is provided
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $uploadDir = __DIR__ . '/uploads/';

    // Create upload directory if it doesn't exist
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to create upload directory.']);
        exit;
    }

    $file = $_FILES['image'];

    // Handle file upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Upload error.', 'error_code' => $file['error']]);
        exit;
    }

    // Validate file size
    if ($file['size'] > MAX_FILE_SIZE) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'File exceeds the maximum size of 5MB.']);
        exit;
    }

    $tmpName = $file['tmp_name'];
    $originalName = basename($file['name']);

    // Validate the uploaded file is an image
    $fileInfo = getimagesize($tmpName);
    if ($fileInfo === false) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid image file.']);
        exit;
    }

    // Validate image type
    if (!in_array($fileInfo[2], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Only JPEG, PNG, GIF, and WEBP formats are allowed.']);
        exit;
    }

    // Validate file extension
    $fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($fileExt, $allowedExtensions)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid file extension.']);
        exit;
    }

    // Generate unique file name and move the file
    $newName = uniqid('img_', true) . '.' . $fileExt;
    $destination = $uploadDir . $newName;

    if (move_uploaded_file($tmpName, $destination)) {
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Image uploaded successfully.',
            'file_path' => 'uploads/' . $newName
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to upload the image.']);
    }
    exit;
}

// Handle invalid requests
http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Invalid request. Use POST with an image.']);
