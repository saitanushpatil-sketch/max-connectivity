import { create } from 'zustand';

export const storeCallToSession = (call) => {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.setItem('max_incoming_call', JSON.stringify(call)); } catch { /* */ }
};

export const retrieveCallFromSession = () => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const data = sessionStorage.getItem('max_incoming_call');
    sessionStorage.removeItem('max_incoming_call');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const useCallStore = create((set) => ({
  incomingCall: null,
  activeCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  clearIncomingCall: () => set({ incomingCall: null }),
  setActiveCall: (call) => set({ activeCall: call }),
  clearActiveCall: () => set({ activeCall: null }),
}));

export default useCallStore;
