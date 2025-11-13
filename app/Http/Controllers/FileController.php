<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class FileController extends Controller
{
    private $basePath = 'uploads';

    public function index(Request $request)
    {
        $path = $request->get('path', '');
        $recursive = $request->get('recursive', false);
        
        // Convert string 'true' to boolean
        if ($recursive === 'true' || $recursive === true || $recursive === '1' || $recursive === 1) {
            $recursive = true;
        } else {
            $recursive = false;
        }
        
        $fullPath = $this->basePath . ($path ? '/' . $path : '');
        
        if (!Storage::exists($fullPath)) {
            Storage::makeDirectory($fullPath);
        }

        if ($recursive) {
            // Load all files recursively for tree view
            $files = $this->loadFilesRecursive($this->basePath);
            // Log for debugging
            \Log::info('Recursive files loaded', ['count' => count($files), 'basePath' => $this->basePath]);
            return response()->json(['files' => $files]);
        }

        $files = [];
        $items = Storage::files($fullPath);
        $directories = Storage::directories($fullPath);

        foreach ($directories as $dir) {
            $files[] = [
                'name' => basename($dir),
                'type' => 'directory',
                'path' => str_replace($this->basePath . '/', '', $dir),
            ];
        }

        foreach ($items as $file) {
            $files[] = [
                'name' => basename($file),
                'type' => 'file',
                'path' => str_replace($this->basePath . '/', '', $file),
                'size' => Storage::size($file),
            ];
        }

        return response()->json(['files' => $files]);
    }

    private function loadFilesRecursive($basePath, $currentPath = '')
    {
        $fullPath = $basePath . ($currentPath ? '/' . $currentPath : '');
        $files = [];

        if (!Storage::exists($fullPath)) {
            return $files;
        }

        $items = Storage::files($fullPath);
        $directories = Storage::directories($fullPath);

        // Add directories first
        foreach ($directories as $dir) {
            // Get relative path - Storage returns paths relative to disk root
            // So we need to remove basePath prefix
            $relativePath = $dir;
            $basePrefix = $basePath . '/';
            if (strpos($dir, $basePrefix) === 0) {
                $relativePath = substr($dir, strlen($basePrefix));
            } elseif ($dir === $basePath) {
                continue; // Skip if it's the base path itself
            }
            
            $files[] = [
                'name' => basename($dir),
                'type' => 'directory',
                'path' => $relativePath,
                'children' => $this->loadFilesRecursive($basePath, $relativePath),
            ];
        }

        // Add files
        foreach ($items as $file) {
            // Get relative path - Storage returns paths relative to disk root
            $relativePath = $file;
            $basePrefix = $basePath . '/';
            if (strpos($file, $basePrefix) === 0) {
                $relativePath = substr($file, strlen($basePrefix));
            }
            
            $files[] = [
                'name' => basename($file),
                'type' => 'file',
                'path' => $relativePath,
                'size' => Storage::size($file),
            ];
        }

        return $files;
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:zip|max:102400', // 100MB max
        ]);

        $file = $request->file('file');
        $fullPath = $this->basePath;

        // Delete all existing files and folders before uploading new project
        if (Storage::exists($fullPath)) {
            $allFiles = Storage::allFiles($fullPath);
            $allDirectories = Storage::allDirectories($fullPath);
            
            // Delete all files
            Storage::delete($allFiles);
            
            // Delete all directories (in reverse order to delete nested dirs first)
            rsort($allDirectories);
            foreach ($allDirectories as $dir) {
                Storage::deleteDirectory($dir);
            }
        }

        // Create base directory if it doesn't exist
        if (!Storage::exists($fullPath)) {
            Storage::makeDirectory($fullPath);
        }

        $zipPath = $file->storeAs($fullPath, $file->getClientOriginalName());

        // Extract ZIP file directly to base path (root of uploads)
        $zip = new ZipArchive;
        $zipFile = Storage::path($zipPath);
        $extractPath = Storage::path($fullPath);
        
        // Ensure extract path exists
        if (!file_exists($extractPath)) {
            mkdir($extractPath, 0755, true);
        }
        
        if ($zip->open($zipFile) === TRUE) {
            $extracted = $zip->extractTo($extractPath);
            $zip->close();

            if (!$extracted) {
                Storage::delete($zipPath);
                return response()->json(['message' => 'Failed to extract ZIP file'], 400);
            }

            // Delete the ZIP file after extraction
            Storage::delete($zipPath);
            
            // Ensure extraction is complete before returning
            clearstatcache();
            
            // Verify files were extracted
            $extractedFiles = Storage::allFiles($fullPath);
            $extractedDirs = Storage::allDirectories($fullPath);
            
            if (empty($extractedFiles) && empty($extractedDirs)) {
                return response()->json(['message' => 'ZIP extracted but no files found'], 400);
            }
        } else {
            Storage::delete($zipPath);
            return response()->json(['message' => 'Failed to open ZIP file'], 400);
        }

        return response()->json([
            'message' => 'Project uploaded and extracted successfully. Previous project has been replaced.',
        ]);
    }

    public function read(Request $request)
    {
        $path = $request->get('path');
        $fullPath = $this->basePath . '/' . $path;

        if (!Storage::exists($fullPath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $content = Storage::get($fullPath);
        
        // Check if file is binary
        if (!mb_check_encoding($content, 'UTF-8')) {
            return response()->json(['message' => 'File is binary and cannot be displayed'], 400);
        }

        return response()->json(['content' => $content]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
            'content' => 'required|string',
        ]);

        $path = $request->get('path');
        $fullPath = $this->basePath . '/' . $path;

        if (!Storage::exists($fullPath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        Storage::put($fullPath, $request->get('content'));

        return response()->json(['message' => 'File saved successfully']);
    }

    public function destroy(Request $request)
    {
        $path = $request->get('path');
        $fullPath = $this->basePath . '/' . $path;
        $storagePath = Storage::path($fullPath);

        if (!Storage::exists($fullPath) && !file_exists($storagePath)) {
            return response()->json(['message' => 'File or directory not found'], 404);
        }

        if (is_dir($storagePath)) {
            Storage::deleteDirectory($fullPath);
        } else {
            Storage::delete($fullPath);
        }

        return response()->json(['message' => 'Deleted successfully']);
    }
}
