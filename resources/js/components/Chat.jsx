import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Register from './Register';

function Chat({ user, onLogout, onLogin }) {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [toast, setToast] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const messagesEndRef = useRef(null);
    const editInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chats from localStorage on mount
    useEffect(() => {
        const savedChats = localStorage.getItem('gchat_chats');
        if (savedChats) {
            try {
                const parsedChats = JSON.parse(savedChats);
                setChats(parsedChats);
                if (parsedChats.length > 0 && !activeChatId) {
                    setActiveChatId(parsedChats[0].id);
                    setMessages(parsedChats[0].messages || []);
                }
            } catch (error) {
                console.error('Error loading chats:', error);
            }
        }
    }, []);

    // Save chats to localStorage whenever chats change
    useEffect(() => {
        if (chats.length > 0) {
            try {
                localStorage.setItem('gchat_chats', JSON.stringify(chats));
            } catch (error) {
                console.error('Error saving chats:', error);
            }
        }
    }, [chats]);

    // Update messages when active chat changes
    useEffect(() => {
        if (activeChatId && chats.length > 0) {
            const chat = chats.find(c => c.id === activeChatId);
            if (chat) {
                setMessages(chat.messages || []);
            }
        } else if (!activeChatId) {
            setMessages([]);
        }
    }, [activeChatId]);

    // Set sidebar default state based on screen size (only on initial load)
    useEffect(() => {
        const handleResize = () => {
            // Only auto-open on desktop if sidebar state hasn't been manually toggled
            if (window.innerWidth >= 768 && sidebarOpen === false) {
                // Don't force open if user has manually closed it
                return;
            }
        };

        // Set initial state only on mount
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }

        // Listen for resize events
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const createNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
        };
        setChats([newChat, ...chats]);
        setActiveChatId(newChat.id);
        setMessages([]);
    };

    const deleteChat = (chatId, e) => {
        e.stopPropagation();
        const chat = chats.find(c => c.id === chatId);
        setDeleteConfirm({
            chatId,
            title: chat?.title || 'this chat'
        });
    };

    const confirmDeleteChat = () => {
        if (!deleteConfirm) return;
        
        const { chatId } = deleteConfirm;
        const updatedChats = chats.filter(c => c.id !== chatId);
        setChats(updatedChats);
        
        if (activeChatId === chatId) {
            if (updatedChats.length > 0) {
                setActiveChatId(updatedChats[0].id);
            } else {
                setActiveChatId(null);
                setMessages([]);
            }
        }

        if (updatedChats.length === 0) {
            localStorage.removeItem('gchat_chats');
        }

        setToast({ type: 'success', message: 'Chat deleted successfully!' });
        setTimeout(() => setToast(null), 3000);
        setDeleteConfirm(null);
    };

    const switchChat = (chatId) => {
        if (editingChatId) {
            return; // Don't switch if editing
        }
        setActiveChatId(chatId);
        // Close sidebar on mobile after selecting chat
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    const startEditChat = (chatId, currentTitle, e) => {
        e.stopPropagation();
        setEditingChatId(chatId);
        setEditingTitle(currentTitle);
    };

    const saveEditChat = (chatId) => {
        if (editingTitle.trim()) {
            setChats(prevChats => prevChats.map(chat => 
                chat.id === chatId 
                    ? { ...chat, title: editingTitle.trim() }
                    : chat
            ));
        }
        setEditingChatId(null);
        setEditingTitle('');
    };

    const cancelEditChat = () => {
        setEditingChatId(null);
        setEditingTitle('');
    };

    useEffect(() => {
        if (editingChatId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingChatId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        // Create new chat if no active chat
        let currentChatId = activeChatId;
        if (!currentChatId) {
            const newChat = {
                id: Date.now().toString(),
                title: userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : ''),
                messages: [],
                createdAt: new Date().toISOString(),
            };
            setChats([newChat, ...chats]);
            currentChatId = newChat.id;
            setActiveChatId(currentChatId);
        }

        const newUserMessage = { role: 'user', content: userMessage };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setLoading(true);

        // Update chat title if it's the first message
        if (messages.length === 0) {
            setChats(prevChats => prevChats.map(chat => 
                chat.id === currentChatId 
                    ? { ...chat, title: userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '') }
                    : chat
            ));
        }

        try {
            const response = await axios.post('/chat', { message: userMessage });
            const assistantMessage = { role: 'assistant', content: response.data.response };
            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);

            // Update chat in chats array
            setChats(prevChats => prevChats.map(chat => 
                chat.id === currentChatId 
                    ? { ...chat, messages: finalMessages }
                    : chat
            ));
        } catch (error) {
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            };
            const finalMessages = [...updatedMessages, errorMessage];
            setMessages(finalMessages);

            // Update chat in chats array
            setChats(prevChats => prevChats.map(chat => 
                chat.id === currentChatId 
                    ? { ...chat, messages: finalMessages }
                    : chat
            ));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 relative">
            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`${
                sidebarOpen 
                    ? 'w-64' 
                    : 'w-0 md:w-0'
            } transition-all duration-300 bg-gray-900 dark:bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden fixed md:relative h-full z-50 md:z-auto`}>
                <div className="p-3 md:p-4 border-b border-gray-700">
                    <button
                        onClick={createNewChat}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2 text-sm md:text-base touch-manipulation"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">New Chat</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {chats.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs md:text-sm mt-8 px-2">
                            No chats yet. Start a new conversation!
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chats.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => switchChat(chat.id)}
                                    className={`group flex items-center justify-between p-2.5 md:p-3 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                                        activeChatId === chat.id
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-300 hover:bg-gray-700/50 active:bg-gray-700/70'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        {editingChatId === chat.id ? (
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onBlur={() => saveEditChat(chat.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        saveEditChat(chat.id);
                                                    } else if (e.key === 'Escape') {
                                                        cancelEditChat();
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        ) : (
                                            <div 
                                                className="text-sm font-medium truncate"
                                                onDoubleClick={(e) => startEditChat(chat.id, chat.title, e)}
                                                title="Double-click to edit"
                                            >
                                                {chat.title}
                                            </div>
                                        )}
                                        {chat.messages && chat.messages.length > 0 && editingChatId !== chat.id && (
                                            <div className="text-xs text-gray-400 mt-1 truncate">
                                                {chat.messages[0].content.substring(0, 30)}...
                                            </div>
                                        )}
                                    </div>
                                    {editingChatId !== chat.id && (
                                        <button
                                            onClick={(e) => deleteChat(chat.id, e)}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 md:p-1 hover:bg-gray-600 active:bg-gray-500 rounded transition-opacity touch-manipulation"
                                            aria-label="Delete chat"
                                        >
                                            <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* User Info at Bottom */}
                <div className="p-3 md:p-4 border-t border-gray-700">
                    {user ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-8 w-8 md:h-8 md:w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs md:text-sm font-medium text-white truncate">
                                    {user.name}
                                </div>
                                <div className="text-xs text-gray-400 truncate hidden sm:block">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="h-8 w-8 md:h-8 md:w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                                    G
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs md:text-sm font-medium text-white truncate">
                                        Guest User
                                    </div>
                                    <div className="text-xs text-gray-400 truncate hidden sm:block">
                                        Not logged in
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowLogin(true);
                                    if (window.innerWidth < 768) {
                                        setSidebarOpen(false);
                                    }
                                }}
                                className="w-full px-3 md:px-4 py-2.5 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm font-medium transition-colors touch-manipulation"
                            >
                                Login
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full md:w-auto">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation flex-shrink-0"
                            aria-label="Toggle sidebar"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <img 
                                src="/logo.png" 
                                alt="G Chat Logo" 
                                className="h-7 w-7 md:h-8 md:w-8 object-contain flex-shrink-0"
                                onError={(e) => {
                                    console.error('Logo not found at /logo.png');
                                    e.target.style.display = 'none';
                                }}
                                onLoad={() => {
                                    console.log('Logo loaded successfully');
                                }}
                            />
                            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
                                G Chat
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        {user && user.role === 'admin' && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 touch-manipulation whitespace-nowrap"
                            >
                                Dashboard
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (user) {
                                    navigate('/files');
                                } else {
                                    setShowLogin(true);
                                }
                            }}
                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation whitespace-nowrap"
                        >
                            File Manager
                        </button>
                        {user && (
                            <>
                                <span className="hidden sm:inline text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px] md:max-w-none">
                                    {user.name}
                                </span>
                                <button
                                    onClick={onLogout}
                                    className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation whitespace-nowrap"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full px-4">
                        <div className="text-center">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                How can I help you today?
                            </h2>
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                                Start a conversation by typing a message below.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[85%] md:max-w-3xl rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base ${
                                message.role === 'user'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 md:px-4 py-3 md:py-4">
                <form onSubmit={handleSend} className="max-w-3xl mx-auto">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="px-4 md:px-6 py-2.5 md:py-2 text-sm md:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation whitespace-nowrap"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div>

                {/* Login Modal */}
                {showLogin && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowLogin(false);
                                setShowRegister(false);
                            }
                        }}
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 md:p-8 max-w-md w-full mx-2 md:mx-4 max-h-[95vh] md:max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => {
                                    setShowLogin(false);
                                    setShowRegister(false);
                                }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label="Close"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {showRegister ? (
                                <Register
                                    onRegister={(userData, token) => {
                                        onLogin(userData, token);
                                        setShowLogin(false);
                                        setShowRegister(false);
                                    }}
                                    onSwitchToLogin={() => setShowRegister(false)}
                                    onToast={(toastData) => {
                                        setToast(toastData);
                                        setTimeout(() => setToast(null), 5000);
                                    }}
                                />
                            ) : (
                                <Login
                                    onLogin={(userData, token) => {
                                        onLogin(userData, token);
                                        setShowLogin(false);
                                    }}
                                    onSwitchToRegister={() => setShowRegister(true)}
                                    onToast={(toastData) => {
                                        setToast(toastData);
                                        setTimeout(() => setToast(null), 5000);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteConfirm(null);
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Delete Chat
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteChat}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
                        toast.type === 'success' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                    }`}>
                        {toast.type === 'success' ? (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button
                            onClick={() => setToast(null)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default Chat;

