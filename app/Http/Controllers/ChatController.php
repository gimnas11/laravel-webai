<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $userMessage = $request->message;
        $apiKey = env('OPENAI_API_KEY');

        if (!$apiKey) {
            return response()->json([
                'error' => 'OpenAI API key not configured',
            ], 500);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    ['role' => 'user', 'content' => $userMessage]
                ],
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                return response()->json([
                    'response' => $responseData['choices'][0]['message']['content'],
                    'message' => $userMessage,
                ]);
            } else {
                Log::error('OpenAI API Error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json([
                    'error' => 'Failed to get response from AI',
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Chat Error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'An error occurred while processing your request',
            ], 500);
        }
    }
}

