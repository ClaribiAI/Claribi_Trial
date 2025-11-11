/**
 * Utility functions for storing and retrieving chat history in localStorage
 * Stores only user/assistant exchanges (conversationHistory format for backend)
 * Supports multiple chat histories per file
 */

const STORAGE_PREFIX = 'powerbi_chat_history_';
const CHAT_LIST_PREFIX = 'powerbi_chat_list_';

/**
 * Get the storage key for a file
 * @param {string} fileId - The file identifier (sessionId or collection_name)
 * @returns {string} The storage key
 */
const getStorageKey = (fileId) => {
    if (!fileId) {
        throw new Error('File ID is required for chat history storage');
    }
    return `${STORAGE_PREFIX}${fileId}`;
};

/**
 * Get storage key for a specific chat
 * @param {string} fileId - The file identifier
 * @param {string} chatId - The chat identifier
 * @returns {string} The storage key
 */
const getChatStorageKey = (fileId, chatId) => {
    return `${STORAGE_PREFIX}${fileId}_${chatId}`;
};

/**
 * Get storage key for chat list
 * @param {string} fileId - The file identifier
 * @returns {string} The storage key
 */
const getChatListKey = (fileId) => {
    return `${CHAT_LIST_PREFIX}${fileId}`;
};

/**
 * Save chat history to localStorage
 * @param {string} fileId - The file identifier (sessionId or collection_name)
 * @param {string} chatId - The chat identifier
 * @param {Array} conversationHistory - Array of conversation history items with role and content
 * @returns {boolean} True if saved successfully, false otherwise
 */
export const saveChatHistory = (fileId, chatId, conversationHistory) => {
    try {
        if (!fileId || !chatId) {
            console.warn('Cannot save chat history: fileId or chatId is missing');
            return false;
        }

        const key = getChatStorageKey(fileId, chatId);
        const data = {
            conversationHistory: conversationHistory || [],
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(data));
        
        // Ensure chatId is in the chat list
        addChatToList(fileId, chatId);
        
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded. Cannot save chat history.');
        } else {
            console.error('Error saving chat history:', error);
        }
        return false;
    }
};

/**
 * Load chat history from localStorage
 * @param {string} fileId - The file identifier (sessionId or collection_name)
 * @param {string} chatId - The chat identifier
 * @returns {Array|null} The conversation history array or null if not found/error
 */
export const loadChatHistory = (fileId, chatId) => {
    try {
        if (!fileId || !chatId) {
            console.warn('Cannot load chat history: fileId or chatId is missing');
            return null;
        }

        const key = getChatStorageKey(fileId, chatId);
        const stored = localStorage.getItem(key);

        if (!stored) {
            return null;
        }

        const data = JSON.parse(stored);
        
        // Validate data structure
        if (!data || !Array.isArray(data.conversationHistory)) {
            console.warn('Invalid chat history format in localStorage');
            return null;
        }

        // Convert timestamp strings back to Date objects
        const conversationHistory = data.conversationHistory.map(item => ({
            ...item,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
        }));

        return conversationHistory;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Error parsing chat history from localStorage:', error);
            // Clear corrupted data
            if (fileId && chatId) {
                clearChatHistory(fileId, chatId);
            }
        } else {
            console.error('Error loading chat history:', error);
        }
        return null;
    }
};

/**
 * Clear chat history from localStorage
 * @param {string} fileId - The file identifier (sessionId or collection_name)
 * @param {string} chatId - The chat identifier (optional, if not provided clears all chats for the file)
 * @returns {boolean} True if cleared successfully, false otherwise
 */
export const clearChatHistory = (fileId, chatId = null) => {
    try {
        if (!fileId) {
            console.warn('Cannot clear chat history: fileId is missing');
            return false;
        }

        if (chatId) {
            // Clear specific chat
            const key = getChatStorageKey(fileId, chatId);
            localStorage.removeItem(key);
            removeChatFromList(fileId, chatId);
        } else {
            // Clear all chats for this file
            const chats = getChatList(fileId);
            chats.forEach(chat => {
                const key = getChatStorageKey(fileId, chat.id);
                localStorage.removeItem(key);
            });
            const listKey = getChatListKey(fileId);
            localStorage.removeItem(listKey);
        }
        return true;
    } catch (error) {
        console.error('Error clearing chat history:', error);
        return false;
    }
};

/**
 * Get list of chats for a file (with IDs and names)
 * @param {string} fileId - The file identifier
 * @returns {Array<{id: string, name: string}>} Array of chat objects with id and name
 */
export const getChatList = (fileId) => {
    try {
        if (!fileId) {
            return [];
        }

        const listKey = getChatListKey(fileId);
        const stored = localStorage.getItem(listKey);
        
        if (!stored) {
            return [];
        }

        const chats = JSON.parse(stored);
        // Support both old format (array of strings) and new format (array of objects)
        if (Array.isArray(chats)) {
            return chats.map(chat => {
                if (typeof chat === 'string') {
                    // Old format - convert to new format
                    return { id: chat, name: null };
                }
                return chat;
            });
        }
        return [];
    } catch (error) {
        console.error('Error loading chat list:', error);
        return [];
    }
};

/**
 * Add chat to the list
 * @param {string} fileId - The file identifier
 * @param {string} chatId - The chat identifier
 * @param {string} chatName - Optional chat name
 */
const addChatToList = (fileId, chatId, chatName = null) => {
    try {
        if (!fileId || !chatId) return;
        
        const chats = getChatList(fileId);
        if (!chats.find(chat => chat.id === chatId)) {
            chats.push({ id: chatId, name: chatName });
            const listKey = getChatListKey(fileId);
            localStorage.setItem(listKey, JSON.stringify(chats));
        }
    } catch (error) {
        console.error('Error adding chat to list:', error);
    }
};

/**
 * Update chat name in the list
 * @param {string} fileId - The file identifier
 * @param {string} chatId - The chat identifier
 * @param {string} chatName - The new chat name
 */
export const updateChatName = (fileId, chatId, chatName) => {
    try {
        if (!fileId || !chatId) return false;
        
        const chats = getChatList(fileId);
        const chatIndex = chats.findIndex(chat => chat.id === chatId);
        
        if (chatIndex !== -1) {
            chats[chatIndex] = { ...chats[chatIndex], name: chatName };
            const listKey = getChatListKey(fileId);
            localStorage.setItem(listKey, JSON.stringify(chats));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating chat name:', error);
        return false;
    }
};

/**
 * Remove chat from the list
 * @param {string} fileId - The file identifier
 * @param {string} chatId - The chat identifier
 */
const removeChatFromList = (fileId, chatId) => {
    try {
        if (!fileId || !chatId) return;
        
        const chats = getChatList(fileId);
        const filtered = chats.filter(chat => chat.id !== chatId);
        const listKey = getChatListKey(fileId);
        localStorage.setItem(listKey, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing chat from list:', error);
    }
};

/**
 * Generate a new chat ID
 * @returns {string} A new unique chat ID
 */
export const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get file identifier from pbixFile object
 * @param {Object} pbixFile - The Power BI file object
 * @returns {string|null} The file identifier or null if not available
 */
export const getFileId = (pbixFile) => {
    if (!pbixFile) {
        return null;
    }
    // Prefer sessionId, fallback to collection_name
    return pbixFile.sessionId || pbixFile.collection_name || null;
};

