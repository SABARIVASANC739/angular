import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  bidTime: {
    type: Date,
    default: Date.now
  },
  isWinning: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ bidder: 1, bidTime: -1 });
bidSchema.index({ auction: 1, bidTime: -1 });

// Compound index for finding highest bid per auction
bidSchema.index({ auction: 1, amount: -1, bidTime: -1 });

export default mongoose.model('Bid', bidSchema);