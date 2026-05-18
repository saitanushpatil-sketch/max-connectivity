import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../../context/authStore';
import useCallStore from '../../context/callStore';
import { getSocket } from '../../hooks/useSocket';
import IncomingCallModal from './IncomingCallModal';

export default function CallInit() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { incomingCall, setIncomingCall, clearIncomingCall, activeCall } = useCallStore();
  const socket = getSocket();

  useEffect(() => {
    if (!isAuthenticated || !socket) return;

    const onIncoming = (data) => {
      if (activeCall) {
        socket.emit('call:busy', { to: data.from });
        return;
      }
      setIncomingCall(data);
    };

    socket.on('call:incoming', onIncoming);
    return () => socket.off('call:incoming', onIncoming);
  }, [isAuthenticated, socket, activeCall, setIncomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    const caller = incomingCall.fromUser || incomingCall.caller;
    const callType = incomingCall.callType || 'video';
    clearIncomingCall();
    router.push(`/call/${incomingCall.from}?type=${callType}`);
  };

  const handleReject = () => {
    if (!incomingCall || !socket) return;
    socket.emit('call:reject', { to: incomingCall.from });
    clearIncomingCall();
  };

  if (!incomingCall) return null;

  const caller = incomingCall.fromUser || incomingCall.caller;

  return (
    <IncomingCallModal
      caller={caller}
      callType={incomingCall.callType}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
