const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callType: { type: String, enum: ['video', 'audio'], default: 'video' },
  duration: { type: Number, default: 0 }, // in seconds
  status: { type: String, enum: ['completed', 'missed', 'rejected', 'busy'], required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
