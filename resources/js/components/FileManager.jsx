import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

function FileManager({ user, onLogout }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [fileTree, setFileTree] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [currentFile, setCurrentFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [aiMessages, setAiMessages] = useState([]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiMessagesEndRef = useRef(null);

    // Redirect to home if not logged in
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user) {
            loadFiles();
        }
    }, [user]);

    // Scroll to bottom of AI messages
    useEffect(() => {
        if (aiPanelOpen && aiMessagesEndRef.current) {
            aiMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [aiMessages, aiPanelOpen]);

    const handleAiSend = async (e) => {
        e.preventDefault();
        if (!aiInput.trim() || aiLoading) return;

        const userMessage = aiInput.trim();
        setAiInput('');

        const newUserMessage = { role: 'user', content: userMessage };
        const updatedMessages = [...aiMessages, newUserMessage];
        setAiMessages(updatedMessages);
        setAiLoading(true);

        try {
            // Include current file context if available
            let contextMessage = userMessage;
            if (currentFile && fileContent) {
                contextMessage = `File: ${currentFile.name}\n\nFile Content:\n${fileContent}\n\nQuestion: ${userMessage}`;
            }

            const response = await axios.post('/chat', { message: contextMessage });
            const assistantMessage = { role: 'assistant', content: response.data.response };
            setAiMessages([...updatedMessages, assistantMessage]);
        } catch (error) {
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            };
            setAiMessages([...updatedMessages, errorMessage]);
        } finally {
            setAiLoading(false);
        }
    };

    // Set sidebar default state based on screen size (only on initial load)
    useEffect(() => {
        // Set initial state only on mount
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/files', {
                params: { recursive: 'true' }
            });
            const newFiles = response.data.files || [];
            
            console.log('Loaded files:', newFiles);
            console.log('Files count:', newFiles.length);
            
            // Update file tree
            setFileTree(newFiles);
            
            // Only expand root folders (first level), not all subfolders
            const rootFolders = newFiles.filter(item => item && item.type === 'directory');
            const rootFolderPaths = new Set(rootFolders.map(folder => folder.path));
            setExpandedFolders(rootFolderPaths);
            
            console.log('Expanded folders (root only):', Array.from(rootFolderPaths));
            console.log('File tree state updated');
        } catch (error) {
            console.error('Error loading files:', error);
            console.error('Error response:', error.response);
            setToast({ type: 'error', message: 'Error loading files: ' + (error.response?.data?.message || error.message) });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            setToast({ type: 'error', message: 'Please upload a ZIP file' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '');

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        try {
            const response = await axios.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            
            // Wait longer to ensure file extraction is complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Force reload files multiple times to ensure it works
            await loadFiles();
            await new Promise(resolve => setTimeout(resolve, 300));
            await loadFiles();
            
            // Show success toast
            setToast({ type: 'success', message: 'Project uploaded and extracted successfully! Previous project has been replaced.' });
            setTimeout(() => setToast(null), 5000);
        } catch (error) {
            console.error('Error uploading file:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message || 
                                'Unknown error occurred';
            setToast({ type: 'error', message: 'Error uploading file: ' + errorMessage });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileClick = async (file) => {
        if (file.type === 'directory') {
            toggleFolder(file.path);
        } else {
            try {
                const response = await axios.get('/files/read', {
                    params: { path: file.path }
                });
                setCurrentFile(file);
                setFileContent(response.data.content || '');
            } catch (error) {
                console.error('Error reading file:', error);
                setToast({ type: 'error', message: 'Error reading file: ' + (error.response?.data?.message || error.message) });
                setTimeout(() => setToast(null), 5000);
            }
        }
    };

    const toggleFolder = (path) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const handleDeleteFile = (file) => {
        setDeleteConfirm({
            type: 'single',
            file: file,
            name: file.name,
            path: file.path
        });
    };

    const confirmDeleteFile = async () => {
        if (!deleteConfirm) return;

        try {
            await axios.delete('/files', {
                params: { path: deleteConfirm.path }
            });
            await loadFiles();
            if (currentFile && currentFile.path === deleteConfirm.path) {
                setCurrentFile(null);
                setFileContent('');
            }
            setToast({ type: 'success', message: 'File deleted successfully!' });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Error deleting file:', error);
            setToast({ type: 'error', message: 'Error deleting file: ' + (error.response?.data?.message || error.message) });
            setTimeout(() => setToast(null), 5000);
        }
        setDeleteConfirm(null);
    };

    const handleBulkDelete = () => {
        if (selectedFiles.size === 0) {
            setToast({ type: 'error', message: 'Please select files to delete' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        const count = selectedFiles.size;
        setDeleteConfirm({
            type: 'bulk',
            count: count,
            paths: Array.from(selectedFiles)
        });
    };

    const confirmBulkDelete = async () => {
        if (!deleteConfirm || deleteConfirm.type !== 'bulk') return;

        try {
            const deletePromises = deleteConfirm.paths.map(path =>
                axios.delete('/files', { params: { path } })
            );
            await Promise.all(deletePromises);
            await loadFiles();
            
            // Clear current file if it was deleted
            if (currentFile && deleteConfirm.paths.includes(currentFile.path)) {
                setCurrentFile(null);
                setFileContent('');
            }
            
            setSelectedFiles(new Set());
            setSelectMode(false);
            setToast({ type: 'success', message: `${deleteConfirm.count} item(s) deleted successfully!` });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Error deleting files:', error);
            setToast({ type: 'error', message: 'Error deleting files: ' + (error.response?.data?.message || error.message) });
            setTimeout(() => setToast(null), 5000);
        }
        setDeleteConfirm(null);
    };

    const toggleSelectFile = (path) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedFiles(newSelected);
    };

    const selectAllFiles = (items) => {
        const allPaths = new Set();
        const collectPaths = (items) => {
            items.forEach(item => {
                allPaths.add(item.path);
                if (item.children && item.children.length > 0) {
                    collectPaths(item.children);
                }
            });
        };
        collectPaths(items);
        setSelectedFiles(allPaths);
    };

    const deselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleSaveFile = async () => {
        if (!currentFile) return;

        try {
            await axios.put('/files', {
                path: currentFile.path,
                content: fileContent
            });
            setToast({ type: 'success', message: 'File saved successfully!' });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Error saving file:', error);
            setToast({ type: 'error', message: 'Error saving file: ' + (error.response?.data?.message || error.message) });
            setTimeout(() => setToast(null), 5000);
        }
    };

    const getFileIcon = (file) => {
        if (file.type === 'directory') {
            return (
                <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
            );
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const iconMap = {
            'js': 'text-yellow-400',
            'jsx': 'text-yellow-400',
            'ts': 'text-blue-400',
            'tsx': 'text-blue-400',
            'php': 'text-indigo-400',
            'py': 'text-yellow-500',
            'java': 'text-orange-500',
            'cpp': 'text-blue-500',
            'c': 'text-blue-500',
            'html': 'text-orange-500',
            'css': 'text-blue-500',
            'json': 'text-green-500',
            'xml': 'text-orange-500',
            'yml': 'text-purple-500',
            'yaml': 'text-purple-500',
            'md': 'text-gray-400',
            'sql': 'text-blue-400',
            'sh': 'text-green-400',
            'bash': 'text-green-400',
        };
        const color = iconMap[ext] || 'text-gray-400';
        return (
            <svg className={`w-4 h-4 ${color} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
        );
    };

    const getLanguage = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const langMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'php': 'php',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'xml': 'xml',
            'yml': 'yaml',
            'yaml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
        };
        return langMap[ext] || 'plaintext';
    };

    const renderFileTree = (items, level = 0) => {
        if (!items || items.length === 0) {
            return null;
        }
        
        return items.map((item, index) => {
            if (!item) return null;
            
            const isExpanded = expandedFolders.has(item.path);
            const isSelected = currentFile?.path === item.path;
            const isChecked = selectedFiles.has(item.path);
            
            return (
                <div key={`${item.path}-${index}`}>
                    <div
                        className={`group flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer text-xs hover:bg-gray-700/50 ${
                            isSelected && !selectMode ? 'bg-gray-700 text-white' : 'text-gray-300'
                        } ${isChecked ? 'bg-blue-600/30' : ''}`}
                        style={{ paddingLeft: `${level * 16 + 4}px` }}
                        onClick={() => {
                            if (selectMode) {
                                toggleSelectFile(item.path);
                            } else {
                                handleFileClick(item);
                            }
                        }}
                    >
                        {selectMode && (
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelectFile(item.path);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3 h-3 rounded border-gray-500 text-indigo-600 focus:ring-indigo-500 focus:ring-1 cursor-pointer"
                            />
                        )}
                        {item.type === 'directory' ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectMode) {
                                        toggleSelectFile(item.path);
                                    } else {
                                        toggleFolder(item.path);
                                    }
                                }}
                                className="p-0.5 hover:bg-gray-600 rounded flex-shrink-0"
                            >
                                <svg 
                                    className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <div className="w-3 h-3 flex-shrink-0" />
                        )}
                        {getFileIcon(item)}
                        <span className="flex-1 truncate select-none">{item.name}</span>
                        {!selectMode && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(item);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-600 rounded transition-opacity flex-shrink-0"
                                aria-label="Delete"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {item.type === 'directory' && isExpanded && item.children && item.children.length > 0 && (
                        <div>
                            {renderFileTree(item.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
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
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-white font-semibold text-sm md:text-base">EXPLORER</h2>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => {
                                setSelectMode(!selectMode);
                                if (selectMode) {
                                    setSelectedFiles(new Set());
                                }
                            }}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                selectMode 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {selectMode ? 'Cancel' : 'Select'}
                        </button>
                        {selectMode && (
                            <>
                                <button
                                    onClick={() => selectAllFiles(fileTree)}
                                    className="px-2 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-xs"
                                    title="Select All"
                                >
                                    All
                                </button>
                                <button
                                    onClick={deselectAll}
                                    className="px-2 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-xs"
                                    title="Deselect All"
                                >
                                    None
                                </button>
                            </>
                        )}
                    </div>
                    {selectMode && selectedFiles.size > 0 && (
                        <div className="mb-3 p-2 bg-red-600/20 border border-red-600/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-red-300">
                                    {selectedFiles.size} item(s) selected
                                </span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <div className="space-y-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2 text-xs md:text-sm touch-manipulation disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload Project ZIP
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-400 text-center">
                            Uploading a new project will replace the current one
                        </p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center text-gray-400 text-sm mt-8">Loading...</div>
                    ) : fileTree.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs md:text-sm mt-8 px-2">
                            No files. Upload a ZIP file to get started.
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {renderFileTree(fileTree)}
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
                                onError={(e) => e.target.style.display = 'none'}
                            />
                            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
                                File Manager
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <button
                            onClick={() => setAiPanelOpen(!aiPanelOpen)}
                            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation whitespace-nowrap transition-colors ${
                                aiPanelOpen
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            Ask AI
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 touch-manipulation whitespace-nowrap"
                        >
                            Chat
                        </button>
                        {user && (
                            <>
                                <span className="hidden sm:inline text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px] md:max-w-none">
                                    {user.name}
                                </span>
                                <button
                                    onClick={onLogout}
                                    className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 touch-manipulation whitespace-nowrap"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Editor Area */}
                <div className={`flex-1 overflow-hidden flex ${aiPanelOpen ? 'flex-row' : ''}`}>
                    <div className={`${aiPanelOpen ? 'w-full md:w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'} flex flex-col overflow-hidden transition-all duration-300`}>
                        {currentFile ? (
                        <div className="h-full flex flex-col">
                            <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getFileIcon(currentFile)}
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {currentFile.name}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSaveFile}
                                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm touch-manipulation"
                                >
                                    Save
                                </button>
                            </div>
                            <div className="flex-1">
                                <Editor
                                    height="100%"
                                    language={getLanguage(currentFile.name)}
                                    value={fileContent}
                                    onChange={(value) => setFileContent(value || '')}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Select a file to edit
                                </h2>
                                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                                    Click on a file from the explorer to view and edit it
                                </p>
                            </div>
                        </div>
                        )}
                    </div>

                    {/* AI Panel */}
                    {aiPanelOpen && (
                        <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Ask AI
                                </h2>
                                <button
                                    onClick={() => setAiPanelOpen(false)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                {aiMessages.length === 0 && (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                Ask AI about your code
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {currentFile 
                                                    ? `Ask questions about ${currentFile.name} or get help with your code.`
                                                    : 'Select a file and ask questions about it, or ask general coding questions.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {aiMessages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            message.role === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                                                message.role === 'user'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                                        </div>
                                    </div>
                                ))}

                                {aiLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                                            <div className="flex space-x-2">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={aiMessagesEndRef} />
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                                <form onSubmit={handleAiSend} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        placeholder={currentFile ? `Ask about ${currentFile.name}...` : "Ask a question..."}
                                        className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                        disabled={aiLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={aiLoading || !aiInput.trim()}
                                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
                                    Delete {deleteConfirm.type === 'bulk' ? 'Items' : 'File'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {deleteConfirm.type === 'bulk' 
                                        ? `Are you sure you want to delete ${deleteConfirm.count} item(s)? This action cannot be undone.`
                                        : `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`
                                    }
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
                                onClick={deleteConfirm.type === 'bulk' ? confirmBulkDelete : confirmDeleteFile}
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
    );
}

export default FileManager;
