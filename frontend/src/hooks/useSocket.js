import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../context/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const getSocket = () => socketInstance;

const useSocket = (handlers = {}) => {
  const { token, isAuthenticated } = useAuthStore();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = socketInstance;

    const handleConnect = () => handlersRef.current.onConnect?.();
    const handleDisconnect = () => handlersRef.current.onDisconnect?.();

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    const socket = socketInstance;
    if (!socket) return;

    const handleReceiveMessage = (data) => handlersRef.current.onReceiveMessage?.(data);
    const handleUserTyping = (data) => handlersRef.current.onUserTyping?.(data);
    const handleUserStopTyping = (data) => handlersRef.current.onUserStopTyping?.(data);
    const handleUserStatus = (data) => handlersRef.current.onUserStatus?.(data);
    const handleMessageReacted = (data) => handlersRef.current.onMessageReacted?.(data);
    const handleMessagesRead = (data) => handlersRef.current.onMessagesRead?.(data);
    const handleNewMessageNotification = (data) => handlersRef.current.onNewMessageNotification?.(data);
    const handleCallIncoming = (data) => handlersRef.current.onCallIncoming?.(data);
    const handleCallAnswered = (data) => handlersRef.current.onCallAnswered?.(data);
    const handleCallEnded = (data) => handlersRef.current.onCallEnded?.(data);
    const handleCallRejected = (data) => handlersRef.current.onCallRejected?.(data);
    const handleCallIce = (data) => handlersRef.current.onIceCandidate?.(data);
    const handleTttChallenge = (data) => handlersRef.current.onTttChallenge?.(data);
    const handleTttMove = (data) => handlersRef.current.onTttMove?.(data);
    const handleTttResult = (data) => handlersRef.current.onTttResult?.(data);

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('user_status', handleUserStatus);
    socket.on('message_reacted', handleMessageReacted);
    socket.on('messages_read', handleMessagesRead);
    socket.on('new_message_notification', handleNewMessageNotification);
    socket.on('call:incoming', handleCallIncoming);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ice', handleCallIce);
    socket.on('ttt_challenge', handleTttChallenge);
    socket.on('ttt_move', handleTttMove);
    socket.on('ttt_result', handleTttResult);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('user_status', handleUserStatus);
      socket.off('message_reacted', handleMessageReacted);
      socket.off('messages_read', handleMessagesRead);
      socket.off('new_message_notification', handleNewMessageNotification);
      socket.off('call:incoming', handleCallIncoming);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ice', handleCallIce);
      socket.off('ttt_challenge', handleTttChallenge);
      socket.off('ttt_move', handleTttMove);
      socket.off('ttt_result', handleTttResult);
    };
  }, [handlersRef]);

  const emitTttChallenge = useCallback((opponentId, gameId) => {
    socketInstance?.emit('ttt_challenge', { opponentId, gameId });
  }, []);

  const emitTttMove = useCallback((gameId, board, nextPlayer, opponentId) => {
    socketInstance?.emit('ttt_move', { gameId, board, nextPlayer, opponentId });
  }, []);

  const emitTttResult = useCallback((gameId, winner, opponentId) => {
    socketInstance?.emit('ttt_result', { gameId, winner, opponentId });
  }, []);

  const joinConversation = useCallback((conversationId) => {
    socketInstance?.emit('join_conversation', { conversationId });
  }, []);

  const sendMessage = useCallback((data) => {
    return new Promise((resolve, reject) => {
      if (!socketInstance?.connected) return reject(new Error('Socket not connected'));
      socketInstance.emit('send_message', data, (response) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }, []);

  const emitTypingStart = useCallback((conversationId, receiverId) => {
    socketInstance?.emit('typing_start', { conversationId, receiverId });
  }, []);

  const emitTypingStop = useCallback((conversationId, receiverId) => {
    socketInstance?.emit('typing_stop', { conversationId, receiverId });
  }, []);

  const reactMessage = useCallback((messageId, emoji, conversationId) => {
    socketInstance?.emit('react_message', { messageId, emoji, conversationId });
  }, []);

  const markRead = useCallback((conversationId, senderId) => {
    socketInstance?.emit('mark_read', { conversationId, senderId });
  }, []);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  return {
    socket: socketInstance,
    joinConversation,
    sendMessage,
    emitTypingStart,
    emitTypingStop,
    reactMessage,
    markRead,
    disconnect,
    emitTttChallenge,
    emitTttMove,
    emitTttResult,
    isConnected: () => socketInstance?.connected ?? false,
  };
};

export default useSocket;
