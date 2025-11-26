import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';

const ChatModal = ({ isOpen, onClose, schoolId, supplierId, userRole }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [resolvedSchoolId, setResolvedSchoolId] = useState(schoolId);
    const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'
    const messagesEndRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Resolve schoolId for suppliers with auto-created school
    useEffect(() => {
        const resolveSchoolId = async () => {
            if (userRole === 'supplier' && !schoolId) {
                try {
                    // Fetch school info which will auto-create school if needed
                    const response = await fetch('/api/school-info');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.school?._id || data.school?.id) {
                            setResolvedSchoolId(data.school._id || data.school.id);
                        }
                    }
                } catch (error) {
                    console.error('Error resolving schoolId for supplier:', error);
                }
            } else {
                setResolvedSchoolId(schoolId);
            }
        };

        if (isOpen) {
            resolveSchoolId();
        }
    }, [isOpen, schoolId, userRole]);

    // Load conversations on mount
    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isOpen]);

    // Auto-select conversation if supplierId is provided
    useEffect(() => {
        if (isOpen && supplierId && !loadingConversations) {
            console.log('[ChatModal] Auto-selecting conversation:', {
                supplierId,
                supplierIdType: typeof supplierId,
                conversationsCount: conversations.length,
                resolvedSchoolId,
                userRole
            });

            // Wait for conversations to load
            if (conversations.length > 0) {
                const conv = conversations.find(c => {
                    const convSupplierId = c.supplier?._id?.toString() || c.supplier?.toString();
                    const targetSupplierId = supplierId?.toString();
                    return convSupplierId === targetSupplierId;
                });
                if (conv) {
                    console.log('[ChatModal] Found existing conversation:', conv._id);
                    selectConversation(conv._id);
                } else {
                    // Create new conversation
                    console.log('[ChatModal] No matching conversation found, creating new one');
                    createConversation(supplierId);
                }
            } else if (conversations.length === 0 && supplierId && resolvedSchoolId) {
                // No conversations yet, create one
                console.log('[ChatModal] No conversations exist, creating new one');
                createConversation(supplierId);
            } else if (conversations.length === 0 && supplierId && !resolvedSchoolId && userRole === 'supplier') {
                // For suppliers, wait for schoolId to be resolved
                console.log('[ChatModal] Waiting for schoolId to be resolved for supplier');
            }
        }
    }, [isOpen, supplierId, conversations, loadingConversations, resolvedSchoolId, userRole]);

    // Reset mobile view when modal closes
    useEffect(() => {
        if (!isOpen) {
            setMobileView('list');
            setSelectedConversation(null);
            setMessages([]);
        }
    }, [isOpen]);

    // Poll for new messages
    useEffect(() => {
        if (isOpen && selectedConversation) {
            pollIntervalRef.current = setInterval(() => {
                fetchMessages(selectedConversation);
            }, 3000); // Poll every 3 seconds

            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
            };
        }
    }, [isOpen, selectedConversation]);

    const fetchConversations = async () => {
        try {
            setLoadingConversations(true);
            console.log('[ChatModal] Fetching conversations...');
            const response = await fetch('/api/conversations');
            if (response.ok) {
                const data = await response.json();
                console.log('[ChatModal] Conversations fetched:', {
                    count: data.conversations?.length || 0,
                    conversations: data.conversations?.map(c => ({
                        id: c._id,
                        supplierId: c.supplier?._id || c.supplier,
                        schoolId: c.school?._id || c.school
                    }))
                });
                setConversations(data.conversations || []);
            } else {
                // If 404, it means no school/supplier found, return empty array
                if (response.status === 404) {
                    console.log('[ChatModal] No school/supplier found for user, returning empty conversations');
                    setConversations([]);
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
                    console.error('[ChatModal] Error fetching conversations:', errorData);
                    toast.error(errorData.message || 'Erreur lors du chargement des conversations');
                    setConversations([]);
                }
            }
        } catch (error) {
            console.error('[ChatModal] Error fetching conversations:', error);
            toast.error('Erreur lors du chargement des conversations');
            setConversations([]);
        } finally {
            setLoadingConversations(false);
        }
    };

    const createConversation = async (supplierId) => {
        if (!resolvedSchoolId) {
            console.error('[ChatModal] Cannot create conversation: schoolId not resolved', {
                schoolId,
                resolvedSchoolId,
                userRole
            });
            toast.error('Impossible de créer la conversation: école non trouvée');
            return;
        }

        try {
            console.log('[ChatModal] Creating conversation:', {
                schoolId: resolvedSchoolId,
                supplierId,
                supplierIdType: typeof supplierId
            });

            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: resolvedSchoolId,
                    supplierId: supplierId?.toString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[ChatModal] Conversation created successfully:', data.conversation?._id);
                await fetchConversations();
                if (data.conversation) {
                    await selectConversation(data.conversation._id);
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
                console.error('[ChatModal] Error creating conversation:', errorData);
                toast.error(errorData.message || 'Erreur lors de la création de la conversation');
            }
        } catch (error) {
            console.error('[ChatModal] Error creating conversation:', error);
            toast.error('Erreur lors de la création de la conversation');
        }
    };

    const selectConversation = async (conversationId) => {
        setSelectedConversation(conversationId);
        await fetchMessages(conversationId);
        // On mobile, switch to chat view
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileView('chat');
        }
    };

    const goBackToList = () => {
        setMobileView('list');
        setSelectedConversation(null);
        setMessages([]);
    };

    const fetchMessages = async (conversationId) => {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            setSending(true);
            const response = await fetch(`/api/conversations/${selectedConversation}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newMessage.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
                scrollToBottom();
                await fetchConversations(); // Refresh to update last message
            } else {
                toast.error('Erreur lors de l\'envoi du message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Erreur lors de l\'envoi du message');
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const getOtherParticipant = (conversation) => {
        if (userRole === 'school_manager') {
            return conversation.supplier;
        } else {
            return conversation.school;
        }
    };

    const getUnreadCount = (conversation) => {
        if (userRole === 'school_manager') {
            return conversation.unreadCountSchool || 0;
        } else {
            return conversation.unreadCountSupplier || 0;
        }
    };

    if (!isOpen) return null;

    const currentConversation = conversations.find(c => c._id === selectedConversation);
    const otherParticipant = currentConversation ? getOtherParticipant(currentConversation) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-none md:rounded-lg shadow-2xl w-full h-full md:h-[90vh] md:max-w-6xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
                    {/* Mobile: Show back button when in chat view */}
                    {mobileView === 'chat' ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={goBackToList} className="md:hidden">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="hidden md:flex items-center space-x-3">
                                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Messages</h2>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Messages</h2>
                        </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Conversations List - Hidden on mobile when in chat view */}
                    <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex w-full md:w-80 border-r border-gray-200 flex-col`}>
                        <div className="p-3 sm:p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Conversations</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingConversations ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    <p>Aucune conversation</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    {conversations.map((conversation) => {
                                        const participant = getOtherParticipant(conversation);
                                        const unreadCount = getUnreadCount(conversation);
                                        const isSelected = selectedConversation === conversation._id;

                                        return (
                                            <div
                                                key={conversation._id}
                                                onClick={() => selectConversation(conversation._id)}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${isSelected
                                                    ? 'bg-blue-50 border-2 border-blue-500'
                                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                                        <AvatarImage src={participant?.logo} />
                                                        <AvatarFallback>
                                                            {participant?.name?.[0]?.toUpperCase() || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-semibold text-gray-900 truncate">
                                                                {participant?.name}
                                                            </p>
                                                            {unreadCount > 0 && (
                                                                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                                                    {unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {conversation.lastMessage && (
                                                            <p className="text-xs text-gray-500 truncate mt-1">
                                                                {conversation.lastMessage.content?.substring(0, 40)}...
                                                            </p>
                                                        )}
                                                        {conversation.lastMessageAt && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                                                    addSuffix: true,
                                                                    locale: fr
                                                                })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Area - Hidden on mobile when in list view */}
                    <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col`}>
                        {selectedConversation && otherParticipant ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center space-x-3 flex-shrink-0">
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={otherParticipant.logo} />
                                        <AvatarFallback>
                                            {otherParticipant.name?.[0]?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{otherParticipant.name}</p>
                                        {otherParticipant.email && (
                                            <p className="text-xs text-gray-500 truncate">{otherParticipant.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                                    <div className="space-y-4">
                                        {messages.map((message) => {
                                            const isOwnMessage = (userRole === 'school_manager' && message.senderType === 'school') ||
                                                ((userRole === 'supplier' || userRole === 'fournisseur') && message.senderType === 'supplier');
                                            return (
                                                <div
                                                    key={message._id}
                                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${isOwnMessage
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-900'
                                                            }`}
                                                    >
                                                        <p className="text-sm break-words">{message.content}</p>
                                                        <p
                                                            className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                                                                }`}
                                                        >
                                                            {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Message Input */}
                                <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                            placeholder="Tapez votre message..."
                                            disabled={sending}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim() || sending}
                                            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                            size="sm"
                                        >
                                            {sending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p>Sélectionnez une conversation pour commencer</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;

