import React, { useState, useEffect, useLayoutEffect, useRef, useContext, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import { formatDatePST } from '../utils/timezone';
import {
  MessageCircle,
  X,
  Send,
  Plus,
  ChevronLeft,
  Minimize2,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Bot
} from 'lucide-react';

const HelpChat = ({ darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentView, setCurrentView] = useState('conversations'); // 'conversations', 'chat', 'new'
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  

  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);

  // New conversation form state
  const [newConversationData, setNewConversationData] = useState({
    type: 'general',
    subject: '',
    priority: 'medium',
    initialMessage: ''
  });

  // Instant scroll to bottom (no animation) - Messenger style
  const scrollToBottomInstant = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setShowScrollToBottom(false);
    }
  }, []);

  // Smooth scroll to bottom (with animation) - for user-triggered actions
  const scrollToBottomSmooth = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowScrollToBottom(false);
    }
  }, []);

  // Check if user is near bottom of messages (memoized to prevent useLayoutEffect recreation)
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 50; // Within 50px of bottom for more responsive auto-scroll
  }, []);



  // SIMPLE: Just mark as read when chat is open, no fancy logic
  const markConversationAsRead = useCallback(async () => {
    if (!currentConversation) {
      console.log('❌ USER CHAT: No current conversation');
      return;
    }
    
    // Check if there are unread messages
    const hasUnreadMessages = (currentConversation.userUnreadCount || currentConversation.unreadCount || 0) > 0;
    console.log('📊 USER CHAT: Mark attempt', {
      conversationId: currentConversation.id,
      userUnreadCount: currentConversation.userUnreadCount,
      unreadCount: currentConversation.unreadCount,
      hasUnreadMessages
    });
    
    if (!hasUnreadMessages) {
      console.log('✅ USER CHAT: No unread messages, skipping mark');
      return;
    }
    
    try {
      console.log('🔥 USER CHAT: Calling markHelpMessagesAsRead');
      await firestoreOperations.markHelpMessagesAsRead(currentConversation.id, auth.currentUser.uid, false);
      
      // Update conversations list
      setConversations(prev => {
        const updatedConversations = prev.map(conv => 
          conv.id === currentConversation.id ? { ...conv, userUnreadCount: 0, unreadCount: 0 } : conv
        );
        
        // Recalculate total unread count for user
        const unread = updatedConversations.reduce((count, conv) => count + (conv.userUnreadCount || conv.unreadCount || 0), 0);
        setUnreadCount(unread);
        
        return updatedConversations;
      });
      console.log('✅ USER CHAT: Successfully marked as read');
    } catch (error) {
      console.error('❌ USER CHAT: Error marking conversation as read:', error);
    }
  }, [currentConversation, firestoreOperations, auth.currentUser.uid]);

  // Simple scroll handler - no auto-mark logic
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const isAtBottom = isNearBottom();
    setIsUserScrolling(!isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 0);
    
    // Update the ref for next auto-scroll decision
    wasNearBottomRef.current = isAtBottom;
  };


  // Track if this is the initial load or a new message
  const isInitialLoad = useRef(true);
  const previousMessageCount = useRef(0);
  const wasNearBottomRef = useRef(true); // Track scroll position before new messages

  // Effect to handle scroll positioning - Messenger style (before paint)
  useLayoutEffect(() => {
    if (messages.length === 0) return;

    const isNewMessage = messages.length > previousMessageCount.current;
    const isFirstLoad = isInitialLoad.current && messages.length > 0;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.senderId === auth.currentUser?.uid;

    if (isFirstLoad) {
      scrollToBottomInstant();
      isInitialLoad.current = false;
      wasNearBottomRef.current = true;
    } else if (isNewMessage) {
      // Use the PREVIOUS scroll state, don't recalculate after new message is added
      const shouldAutoScroll = wasNearBottomRef.current;
      
      if (isOwnMessage) {
        // Always auto-scroll for user's own messages
        scrollToBottomInstant();
        wasNearBottomRef.current = true;
      } else if (shouldAutoScroll) {
        // Auto-scroll for admin messages only if user was near bottom
        scrollToBottomInstant();
        wasNearBottomRef.current = true;
      } else {
        // Show scroll to bottom button if user was scrolled up
        setShowScrollToBottom(true);
      }
      
      // SIMPLE: If admin sends message while user is in chat, mark as read immediately
      if (!isOwnMessage && currentView === 'chat' && currentConversation && isOpen && !isMinimized) {
        console.log('🔥 USER CHAT: Marking as read because admin sent message while chat open');
        markConversationAsRead();
      } else if (!isOwnMessage) {
        console.log('❌ USER CHAT: NOT marking as read', {
          isOwnMessage,
          currentView,
          hasConversation: !!currentConversation,
          isOpen,
          isMinimized
        });
      }
    }

    previousMessageCount.current = messages.length;
  }, [messages, scrollToBottomInstant, auth.currentUser?.uid, markConversationAsRead, currentView, currentConversation, isOpen, isMinimized]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoad.current = true;
    previousMessageCount.current = 0;
  }, [currentConversation?.id]);

  // SIMPLE: Mark as read when user opens chat
  useEffect(() => {
    if (currentView === 'chat' && currentConversation && isOpen && !isMinimized) {
      // Just mark it as read immediately - no questions asked!
      markConversationAsRead();
    }
  }, [currentView, currentConversation, isOpen, isMinimized, markConversationAsRead]);


  // Smart message merging to prevent reload behavior - same as admin
  const mergeMessages = useCallback((newMessages) => {
    setMessages(prevMessages => {
      // If it's the first load (no previous messages), just set them
      if (prevMessages.length === 0) {
        return newMessages;
      }

      // Create a map of existing optimistic messages
      const optimisticMessages = prevMessages
        .filter(msg => msg.isOptimistic)
        .reduce((acc, msg) => {
          acc[msg.message] = msg; // Use message content as key for matching
          return acc;
        }, {});

      // Filter out optimistic messages that now have real counterparts
      const realMessages = newMessages.filter(msg => !msg.isOptimistic);
      const filteredOptimistic = Object.values(optimisticMessages)
        .filter(optimisticMsg => {
          // Remove optimistic message if real message with same content exists
          return !realMessages.some(realMsg => 
            realMsg.message === optimisticMsg.message && 
            realMsg.senderId === optimisticMsg.senderId
          );
        });

      // Combine real messages with remaining optimistic messages
      const combinedMessages = [...realMessages, ...filteredOptimistic];
      
      // Sort by timestamp to maintain order
      combinedMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });

      return combinedMessages;
    });
  }, []);

  // Memoized message component to prevent unnecessary re-renders
  const MessageItem = React.memo(({ message, darkMode }) => (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.sender === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
      >
        <div className="flex items-center space-x-2 mb-1">
          {message.sender === 'admin' ? (
            <Bot className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">
            {message.senderName}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.message}
        </p>
        <p className={`text-xs mt-1 ${
          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {(() => {
            try {
              const date = new Date(message.timestamp);
              if (isNaN(date.getTime()) || message.isOptimistic) {
                return 'Just now';
              }
              return formatDatePST(date, {
                hour: 'numeric',
                minute: '2-digit'
              });
            } catch (e) {
              return 'Just now';
            }
          })()}
        </p>
      </div>
    </div>
  ), (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.message === nextProps.message.message &&
      prevProps.message.senderName === nextProps.message.senderName &&
      prevProps.message.sender === nextProps.message.sender &&
      prevProps.message.isOptimistic === nextProps.message.isOptimistic &&
      prevProps.message.timestamp === nextProps.message.timestamp &&
      prevProps.darkMode === nextProps.darkMode
    );
  });

  // Removed auto-marking timer that was causing conversation to close

  // Real-time conversation subscription
  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const unsubscribe = firestoreOperations.subscribeToHelpConversations(
      auth.currentUser.uid,
      (updatedConversations) => {
        setConversations(updatedConversations);
        
        // Calculate unread count for user (use userUnreadCount, fallback to legacy unreadCount)
        const unread = updatedConversations.reduce((count, conv) => count + (conv.userUnreadCount || conv.unreadCount || 0), 0);
        setUnreadCount(unread);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isOpen, auth.currentUser]);

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await firestoreOperations.getUserHelpConversations(auth.currentUser.uid);
      setConversations(userConversations);
      
      // Calculate unread count for user (use userUnreadCount, fallback to legacy unreadCount)
      const unread = userConversations.reduce((count, conv) => count + (conv.userUnreadCount || conv.unreadCount || 0), 0);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const conversationMessages = await firestoreOperations.getHelpMessages(conversationId);
      setMessages(conversationMessages);
      
      // Don't automatically mark as read - user must explicitly do this
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a conversation with real-time messages
  const selectConversation = async (conversation) => {
    setCurrentConversation(conversation);
    setCurrentView('chat');
    
    // No automatic marking - only mark as read manually when user explicitly views
  };

  // Real-time messages subscription
  useEffect(() => {
    if (!currentConversation?.id) return;

    const conversationId = currentConversation.id;

    const unsubscribe = firestoreOperations.subscribeToHelpMessages(
      conversationId,
      (updatedMessages) => {
        mergeMessages(updatedMessages);
        // Smart merging prevents reload behavior
      }
    );

    return unsubscribe;
  }, [currentConversation?.id, mergeMessages]);

  // Send a message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;

    try {
      const messageData = {
        conversationId: currentConversation.id,
        message: newMessage.trim(),
        sender: 'user',
        senderName: auth.currentUser?.displayName || 'User',
        senderEmail: auth.currentUser?.email,
        senderId: auth.currentUser?.uid,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Add optimistic update for instant UI feedback
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        ...messageData,
        isOptimistic: true
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      
      // Send to server (real-time subscription will update UI)
      await firestoreOperations.addHelpMessage(messageData);
      
      // Update conversation's last message timestamp
      await firestoreOperations.updateHelpConversation(currentConversation.id, {
        lastMessageAt: new Date().toISOString(),
        lastMessage: messageData.message
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Create new conversation
  const createConversation = async (e) => {
    e.preventDefault();
    if (!newConversationData.subject.trim() || !newConversationData.initialMessage.trim()) return;

    try {
      setLoading(true);
      
      // Create conversation
      const conversationData = {
        type: newConversationData.type,
        subject: newConversationData.subject,
        priority: newConversationData.priority,
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userName: auth.currentUser?.displayName || 'User',
        status: 'open',
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        lastMessage: newConversationData.initialMessage,
        page: window.location.pathname,
        unreadCount: 0
      };

      const newConversation = await firestoreOperations.createHelpConversation(conversationData);

      // Add initial message
      const messageData = {
        conversationId: newConversation.id,
        message: newConversationData.initialMessage,
        sender: 'user',
        senderName: auth.currentUser?.displayName || 'User',
        senderEmail: auth.currentUser?.email,
        senderId: auth.currentUser?.uid,
        timestamp: new Date().toISOString(),
        read: false
      };

      await firestoreOperations.addHelpMessage(messageData);

      // Reset form and go to chat
      setNewConversationData({
        type: 'general',
        subject: '',
        priority: 'medium',
        initialMessage: ''
      });
      
      // Select the new conversation (real-time subscription will update conversations)
      selectConversation({ ...conversationData, id: newConversation.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get conversation type color
  const getTypeColor = (type) => {
    switch (type) {
      case 'bug': return 'text-red-600 bg-red-100';
      case 'feature': return 'text-blue-600 bg-blue-100';
      case 'help': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className={`w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
              unreadCount > 0 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            aria-label="Open Help Chat"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification pulse animation when chat is closed and there are unread messages */}
          {unreadCount > 0 && (
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
          )}
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 w-96 ${isMinimized ? 'h-14' : 'h-[600px]'} bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col transition-all duration-300 z-50`}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Help & Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Conversations List */}
              {currentView === 'conversations' && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
                        <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-center">No conversations yet. Start a new one!</p>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-gray-700">
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className={`w-full p-4 transition-colors text-left border-l-4 ${
                              (conv.userUnreadCount || conv.unreadCount || 0) > 0
                                ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 hover:bg-blue-100 dark:hover:bg-blue-900 dark:hover:bg-opacity-30 border-blue-500'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-750 border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                  {conv.subject}
                                </h4>
                                {(conv.userUnreadCount || conv.unreadCount || 0) > 0 && (
                                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                                    {(conv.userUnreadCount || conv.unreadCount) > 99 ? '99+' : (conv.userUnreadCount || conv.unreadCount)}
                                  </span>
                                )}
                              </div>
                              {getStatusIcon(conv.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(conv.type)}`}>
                                {conv.type}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {(() => {
                                  try {
                                    const date = new Date(conv.lastMessageAt);
                                    if (isNaN(date.getTime())) {
                                      return 'Recently';
                                    }
                                    return formatDatePST(date, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    });
                                  } catch (e) {
                                    return 'Recently';
                                  }
                                })()}
                              </span>
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-2">
                                {conv.lastMessage}
                              </p>
                            )}
                            {(conv.userUnreadCount || conv.unreadCount || 0) > 0 && (
                              <span className="inline-block mt-2 bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
                                {(conv.userUnreadCount || conv.unreadCount)} new
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* New Conversation Button - Bottom */}
                  <div className="p-4 border-t dark:border-gray-700">
                    <button
                      onClick={() => setCurrentView('new')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Conversation</span>
                    </button>
                  </div>
                </div>
              )}

              {/* New Conversation Form */}
              {currentView === 'new' && (
                <div className="flex-1 flex flex-col p-4">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => setCurrentView('conversations')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors mr-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-semibold text-gray-900 dark:text-white">New Conversation</h3>
                  </div>

                  <form onSubmit={createConversation} className="flex-1 flex flex-col space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={newConversationData.type}
                        onChange={(e) => setNewConversationData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="general">General Question</option>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="help">Need Help</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={newConversationData.priority}
                        onChange={(e) => setNewConversationData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={newConversationData.subject}
                        onChange={(e) => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Brief description..."
                        required
                      />
                    </div>

                    <div className="flex-1 min-h-0">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Message
                      </label>
                      <textarea
                        value={newConversationData.initialMessage}
                        onChange={(e) => setNewConversationData(prev => ({ ...prev, initialMessage: e.target.value }))}
                        className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        placeholder="Describe your issue or question in detail..."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !newConversationData.subject.trim() || !newConversationData.initialMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Start Conversation
                    </button>
                  </form>
                </div>
              )}

              {/* Chat View */}
              {currentView === 'chat' && currentConversation && (
                <div className="h-full flex flex-col">
                  {/* Chat Header - Fixed height */}
                  <div 
                    className="h-20 p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-750"
                    style={{ flexShrink: 0 }}
                  >
                    <div className="flex items-center h-full gap-3">
                      <button
                        onClick={() => {
                          setCurrentView('conversations');
                          setCurrentConversation(null);
                          setMessages([]);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {currentConversation.subject}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs mt-1">
                          <span className={`${getPriorityColor(currentConversation.priority)} font-medium`}>
                            {currentConversation.priority}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {currentConversation.status}
                          </span>
                        </div>
                      </div>
                      
                    </div>
                  </div>

                  {/* Messages Container - Calculated height */}
                  <div 
                    className="relative overflow-hidden"
                    style={{ 
                      height: currentConversation.status !== 'resolved' ? 'calc(100% - 160px)' : 'calc(100% - 140px)',
                      flexShrink: 0
                    }}
                  >
                    <div 
                      ref={messagesContainerRef}
                      className="h-full overflow-y-auto p-4 chat-scrollbar"
                      onScroll={handleScroll}
                    >
                      {loading ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="min-h-full flex flex-col justify-end">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                              No messages yet
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {messages.map((message) => (
                                <MessageItem
                                  key={message.id}
                                  message={message}
                                  darkMode={darkMode}
                                />
                              ))}
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                      
                      {/* Scroll to bottom button - positioned relative to messages container */}
                      {showScrollToBottom && (
                        <button
                          onClick={() => scrollToBottomSmooth()}
                          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                          aria-label="Scroll to bottom"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Input - Fixed height */}
                  {currentConversation.status !== 'resolved' && (
                    <div 
                      className="h-20 p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800"
                      style={{ flexShrink: 0 }}
                    >
                      <form onSubmit={sendMessage} className="h-full">
                        <div className="flex gap-2 h-full items-center">
                          <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Resolved Status - Fixed height */}
                  {currentConversation.status === 'resolved' && (
                    <div 
                      className="h-12 px-4 py-2 border-t dark:border-gray-700 bg-green-50 dark:bg-green-900/20 flex items-center justify-center"
                      style={{ flexShrink: 0 }}
                    >
                      <p className="text-xs text-green-800 dark:text-green-300">
                        This conversation has been resolved
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default HelpChat;