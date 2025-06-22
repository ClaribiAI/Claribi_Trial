import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../../../../../contexts/NotificationContext';
import chatbotService from '../../../../../services/chatbotService';
import fileUploadService from '../../../../../services/fileUploadService';

export const useQueryAssistant = (projectId, reportId) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{
    id: 1,
    text: "Hello! I'm your assistant. You can ask me questions about your data.",
    sender: 'bot',
    timestamp: new Date().toISOString()
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [embedHistory, setEmbedHistory] = useState([]);
  const [embedIndex, setEmbedIndex] = useState(-1);
  const [hasData, setHasData] = useState(false);
  const messagesEndRef = useRef(null);

  const { showNotification } = useNotification();

  useEffect(() => {
    if (projectId && reportId) {
      checkHasData();
    }
  }, [projectId, reportId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const checkHasData = useCallback(async () => {
    try {
      const response = await fileUploadService.checkHasData(projectId, reportId);
      if (response?.data?.success) {
        setHasData(response.data.has_data);
        return response.data.has_data;
      } else {
        setHasData(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking data status:', err);
      setHasData(false);
      return false;
    }
  }, [projectId, reportId]);

  const handleSendMessage = useCallback(async () => {
    if (inputMessage.trim()) {
      // Add user message
      const userMessage = {
        id: Date.now(),
        text: inputMessage,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsTyping(true);

      try {
        const response = await chatbotService.sendQuery(projectId, reportId, userMessage.text);
        let botMessageText;
        let url = null;
        let filters = null;
        if (response?.data?.success) {
          url = response.data.url;
          filters = response.data.filters;
          botMessageText = response.data.message || response.data.response || 'No response';
        } else {
          botMessageText = response?.data?.error || "I'm sorry, I couldn't process your query. Please try again with different wording.";
        }
        const botMessage = {
          id: Date.now() + 1,
          text: botMessageText,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          url,
          filters
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);

        // Store embed URL if present, and update history
        if (url && url.startsWith('https://app.powerbi.com/reportEmbed?')) {
          setEmbedHistory(prev => {
            const newHistory = prev.slice(0, embedIndex + 1); // Discard forward history if any
            newHistory.push({ url, message: botMessageText, timestamp: botMessage.timestamp });
            return newHistory;
          });
          setEmbedIndex(prev => prev + 1);
        }
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            text: 'Sorry, there was an error contacting the assistant.',
            sender: 'bot',
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsTyping(false);
      }
    }
  }, [inputMessage, projectId, reportId, embedIndex]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleBackEmbed = useCallback(() => {
    if (embedIndex > 0) {
      setEmbedIndex(prev => prev - 1);
    }
  }, [embedIndex]);

  const handleForwardEmbed = useCallback(() => {
    if (embedIndex < embedHistory.length - 1) {
      setEmbedIndex(prev => prev + 1);
    }
  }, [embedIndex, embedHistory.length]);

  return {
    loading,
    messages,
    inputMessage,
    isTyping,
    hasData,
    embedHistory,
    embedIndex,
    currentEmbed: embedIndex >= 0 ? embedHistory[embedIndex] : null,
    messagesEndRef,
    setInputMessage,
    handleSendMessage,
    handleKeyPress,
    handleBackEmbed,
    handleForwardEmbed,
  };
};

export default useQueryAssistant; 