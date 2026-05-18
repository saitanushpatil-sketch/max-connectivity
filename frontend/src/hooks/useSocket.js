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

    const on = (event, fn) => socket.on(event, fn);
    const off = (event, fn) => socket.off(event, fn);

    const handleConnect = () => handlersRef.current.onConnect?.();
    const handleDisconnect = () => handlersRef.current.onDisconnect?.();
    const handleReceiveMessage = (data) => handlersRef.current.onReceiveMessage?.(data);
    const handleNewNotification = (data) => handlersRef.current.onNewMessageNotification?.(data);
    const handleUserTyping = (data) => handlersRef.current.onUserTyping?.(data);
    const handleUserStopTyping = (data) => handlersRef.current.onUserStopTyping?.(data);
    const handleUserStatus = (data) => handlersRef.current.onUserStatus?.(data);
    const handleMessageReacted = (data) => handlersRef.current.onMessageReacted?.(data);
    const handleMessagesRead = (data) => handlersRef.current.onMessagesRead?.(data);
    const handleTttChallenge = (data) => handlersRef.current.onTttChallenge?.(data);
    const handleTttMove = (data) => handlersRef.current.onTttMove?.(data);
    const handleTttResult = (data) => handlersRef.current.onTttResult?.(data);
    const handleCallIncoming = (data) => handlersRef.current.onCallIncoming?.(data);
    const handleCallAnswered = (data) => handlersRef.current.onCallAnswered?.(data);
    const handleIceCandidate = (data) => handlersRef.current.onIceCandidate?.(data);
    const handleCallEnded = (data) => handlersRef.current.onCallEnded?.(data);
    const handleCallRejected = (data) => handlersRef.current.onCallRejected?.(data);
    const handleCallBusy = (data) => handlersRef.current.onCallBusy?.(data);

    on('connect', handleConnect);
    on('disconnect', handleDisconnect);
    on('receive_message', handleReceiveMessage);
    on('new_message_notification', handleNewNotification);
    on('user_typing', handleUserTyping);
    on('user_stop_typing', handleUserStopTyping);
    on('user_status', handleUserStatus);
    on('message_reacted', handleMessageReacted);
    on('messages_read', handleMessagesRead);
    on('ttt_challenge', handleTttChallenge);
    on('ttt_move', handleTttMove);
    on('ttt_result', handleTttResult);
    on('call:incoming', handleCallIncoming);
    on('call:answered', handleCallAnswered);
    on('call:ice', handleIceCandidate);
    on('call:ended', handleCallEnded);
    on('call:rejected', handleCallRejected);
    on('call:busy', handleCallBusy);

    return () => {
      off('connect', handleConnect);
      off('disconnect', handleDisconnect);
      off('receive_message', handleReceiveMessage);
      off('new_message_notification', handleNewNotification);
      off('user_typing', handleUserTyping);
      off('user_stop_typing', handleUserStopTyping);
      off('user_status', handleUserStatus);
      off('message_reacted', handleMessageReacted);
      off('messages_read', handleMessagesRead);
      off('ttt_challenge', handleTttChallenge);
      off('ttt_move', handleTttMove);
      off('ttt_result', handleTttResult);
      off('call:incoming', handleCallIncoming);
      off('call:answered', handleCallAnswered);
      off('call:ice', handleIceCandidate);
      off('call:ended', handleCallEnded);
      off('call:rejected', handleCallRejected);
      off('call:busy', handleCallBusy);
    };
  }, [isAuthenticated, token]);

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
