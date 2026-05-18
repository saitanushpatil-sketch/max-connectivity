import { create } from 'zustand';

const useCallStore = create((set) => ({
  incomingCall: null,
  activeCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  clearIncomingCall: () => set({ incomingCall: null }),
  setActiveCall: (call) => set({ activeCall: call }),
  clearActiveCall: () => set({ activeCall: null }),
}));

export default useCallStore;
