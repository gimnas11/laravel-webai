# Laravel WebAI - G Chat

A modern chat application built with Laravel 12, React, and Tailwind CSS. Features user authentication (login/register) and a chat interface.

## Features

- ✅ Laravel 12 (latest version)
- ✅ React 18 with Vite
- ✅ Tailwind CSS 4
- ✅ User Authentication (Login/Register)
- ✅ Laravel Sanctum for API authentication
- ✅ Modern chat interface
- ✅ Responsive design with dark mode support

## Requirements

- PHP >= 8.2
- Composer
- Node.js >= 18
- npm or yarn
- MySQL/PostgreSQL/SQLite

## Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd laravel-webai
   ```

2. **Install PHP dependencies**:
   ```bash
   composer install
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Update `.env` file** with your database configuration:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel_webai
   DB_USERNAME=root
   DB_PASSWORD=
   ```

6. **Run migrations**:
   ```bash
   php artisan migrate
   ```

7. **Build assets**:
   ```bash
   npm run build
   ```

## Running the Application

### Development Mode

1. **Start Laravel development server**:
   ```bash
   php artisan serve
   ```

2. **Start Vite dev server** (in a separate terminal):
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Open your browser and navigate to `http://localhost:8000`

### Production Mode

1. **Build assets**:
   ```bash
   npm run build
   ```

2. **Start Laravel server**:
   ```bash
   php artisan serve
   ```

## Project Structure

```
laravel-webai/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       ├── AuthController.php    # Authentication logic
│   │       └── ChatController.php    # Chat API endpoints
│   └── Models/
│       └── User.php                  # User model with Sanctum
├── resources/
│   ├── js/
│   │   ├── components/
│   │   │   ├── App.jsx              # Main React app
│   │   │   ├── Login.jsx            # Login component
│   │   │   ├── Register.jsx         # Register component
│   │   │   └── Chat.jsx             # Chat interface
│   │   └── app.jsx                  # React entry point
│   ├── css/
│   │   └── app.css                  # Tailwind CSS
│   └── views/
│       └── app.blade.php            # Main Blade template
├── routes/
│   ├── api.php                      # API routes
│   └── web.php                      # Web routes
└── vite.config.js                   # Vite configuration
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user (requires auth)
- `GET /api/user` - Get current user (requires auth)

### Chat
- `POST /api/chat` - Send a chat message (requires auth)

## Usage

1. **Register a new account**:
   - Click "Create a new account" on the login page
   - Fill in your name, email, and password
   - Click "Create account"

2. **Login**:
   - Enter your email and password
   - Click "Sign in"

3. **Chat**:
   - After logging in, you'll see the chat interface
   - Type your message in the input field
   - Press Enter or click "Send" to send your message

## Customization

### Adding OpenAI Integration

To integrate with OpenAI API, update `app/Http/Controllers/ChatController.php`:

```php
use Illuminate\Support\Facades\Http;

public function sendMessage(Request $request)
{
    $request->validate([
        'message' => 'required|string',
    ]);

    $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
        'Content-Type' => 'application/json',
    ])->post('https://api.openai.com/v1/chat/completions', [
        'model' => 'gpt-3.5-turbo',
        'messages' => [
            ['role' => 'user', 'content' => $request->message]
        ],
    ]);

    return response()->json([
        'response' => $response->json()['choices'][0]['message']['content'],
        'message' => $request->message,
    ]);
}
```

Add your OpenAI API key to `.env`:
```env
OPENAI_API_KEY=your-api-key-here
```

## Technologies Used

- **Backend**: Laravel 12
- **Frontend**: React 18
- **Styling**: Tailwind CSS 4
- **Authentication**: Laravel Sanctum
- **Build Tool**: Vite

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
