let ioInstance = null;
let getUserSocketsFn = null;

exports.setSocketHelpers = (io, getUserSockets) => {
  ioInstance = io;
  getUserSocketsFn = getUserSockets;
};

exports.emitToUser = (userId, event, data) => {
  if (!ioInstance || !getUserSocketsFn) return;
  const sockets = getUserSocketsFn(userId.toString());
  sockets.forEach((sid) => ioInstance.to(sid).emit(event, data));
};

exports.emitToUsers = (userIds, event, data) => {
  const unique = [...new Set(userIds.map((id) => id.toString()))];
  unique.forEach((uid) => exports.emitToUser(uid, event, data));
};
