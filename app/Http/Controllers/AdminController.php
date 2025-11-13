<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    private function checkAdmin($request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }
        return null;
    }

    public function stats(Request $request)
    {
        $check = $this->checkAdmin($request);
        if ($check) {
            return $check;
        }

        try {
            // Total Users
            $totalUsers = User::count();

            // Total Files (count files in uploads directory)
            $totalFiles = 0;
            $basePath = 'uploads';
            if (Storage::exists($basePath)) {
                $allFiles = Storage::allFiles($basePath);
                $totalFiles = count($allFiles);
            }

            // Total Chats (from localStorage on client side, so we return 0 or estimate)
            // Since chats are stored in localStorage, we can't count them from server
            // You might want to create a chats table in the future
            $totalChats = 0;

            return response()->json([
                'totalUsers' => $totalUsers,
                'totalFiles' => $totalFiles,
                'totalChats' => $totalChats,
            ]);
        } catch (\Exception $e) {
            Log::error('Admin stats error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function users(Request $request)
    {
        $check = $this->checkAdmin($request);
        if ($check) {
            return $check;
        }

        try {
            $users = User::select('id', 'name', 'email', 'role', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'users' => $users,
                'count' => $users->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin users error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'users' => [],
            ], 500);
        }
    }
}
