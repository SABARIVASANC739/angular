const { validationResult } = require('express-validator');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');

const placeBid = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { auctionId } = req.params;
    const { amount } = req.body;
    const bidderId = req.user.id;

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if auction is active
    if (!auction.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'Auction is not currently active'
      });
    }

    // Check if bidder is not the seller
    if (auction.seller.toString() === bidderId) {
      return res.status(400).json({
        success: false,
        message: 'Sellers cannot bid on their own auctions'
      });
    }

    // Check if bid amount is higher than current price
    if (amount <= auction.currentPrice) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than current price of $${auction.currentPrice}`
      });
    }

    // Check minimum bid increment (e.g., $1)
    const minIncrement = 1;
    if (amount < auction.currentPrice + minIncrement) {
      return res.status(400).json({
        success: false,
        message: `Minimum bid increment is $${minIncrement}`
      });
    }

    // Create the bid
    const bid = new Bid({
      auction: auctionId,
      bidder: bidderId,
      amount: amount,
      bidTime: new Date()
    });

    // Use transaction to ensure data consistency
    const session = await Bid.startSession();
    session.startTransaction();

    try {
      // Save the bid
      await bid.save({ session });

      // Update all previous bids for this auction to not be winning
      await Bid.updateMany(
        { auction: auctionId, _id: { $ne: bid._id } },
        { isWinning: false },
        { session }
      );

      // Set this bid as winning
      bid.isWinning = true;
      await bid.save({ session });

      // Update auction current price and bid count
      await Auction.findByIdAndUpdate(
        auctionId,
        {
          currentPrice: amount,
          $inc: { totalBids: 1 }
        },
        { session }
      );

      await session.commitTransaction();

      // Populate bid with user info
      await bid.populate('bidder', 'username firstName lastName');

      res.status(201).json({
        success: true,
        message: 'Bid placed successfully',
        data: { bid }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAuctionBids = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if auction exists
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const bids = await Bid.find({ auction: auctionId })
      .populate('bidder', 'username firstName lastName')
      .sort({ bidTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Bid.countDocuments({ auction: auctionId });

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get auction bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUserBids = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let pipeline = [
      { $match: { bidder: userId } }
    ];

    // Add auction lookup
    pipeline.push({
      $lookup: {
        from: 'auctions',
        localField: 'auction',
        foreignField: '_id',
        as: 'auctionInfo'
      }
    });

    pipeline.push({
      $unwind: '$auctionInfo'
    });

    // Filter by auction status if provided
    if (status) {
      pipeline.push({
        $match: { 'auctionInfo.status': status }
      });
    }

    // Sort by bid time
    pipeline.push({
      $sort: { bidTime: -1 }
    });

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    // Populate bidder info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'bidder',
        foreignField: '_id',
        as: 'bidderInfo',
        pipeline: [
          { $project: { username: 1, firstName: 1, lastName: 1 } }
        ]
      }
    });

    const bids = await Bid.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [
      { $match: { bidder: userId } },
      {
        $lookup: {
          from: 'auctions',
          localField: 'auction',
          foreignField: '_id',
          as: 'auctionInfo'
        }
      },
      { $unwind: '$auctionInfo' }
    ];

    if (status) {
      totalPipeline.push({
        $match: { 'auctionInfo.status': status }
      });
    }

    totalPipeline.push({ $count: 'total' });
    const totalResult = await Bid.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getWinningBids = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const winningBids = await Bid.find({
      bidder: userId,
      isWinning: true
    })
      .populate('auction', 'title status endTime')
      .populate('bidder', 'username firstName lastName')
      .sort({ bidTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Bid.countDocuments({
      bidder: userId,
      isWinning: true
    });

    res.json({
      success: true,
      data: {
        bids: winningBids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get winning bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getBidHistory = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId)
      .populate('auction', 'title status')
      .populate('bidder', 'username firstName lastName');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user has permission to view this bid
    if (bid.bidder._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bid'
      });
    }

    res.json({
      success: true,
      data: { bid }
    });
  } catch (error) {
    console.error('Get bid history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  placeBid,
  getAuctionBids,
  getUserBids,
  getWinningBids,
  getBidHistory
};