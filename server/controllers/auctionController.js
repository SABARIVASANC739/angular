import { validationResult } from 'express-validator';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';

const createAuction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      category,
      startingPrice,
      reservePrice,
      startTime,
      endTime
    } = req.body;

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({
        success: false,
        message: 'Start time cannot be in the past'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const auction = new Auction({
      title,
      description,
      category,
      startingPrice,
      reservePrice,
      startTime: start,
      endTime: end,
      seller: req.user.id,
      status: start <= now ? 'active' : 'pending'
    });

    await auction.save();
    await auction.populate('seller', 'username firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: { auction }
    });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAllAuctions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status = 'active',
      search,
      sortBy = 'endTime',
      sortOrder = 'asc'
    } = req.query;

    const query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const auctions = await Auction.find(query)
      .populate('seller', 'username firstName lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Auction.countDocuments(query);

    res.json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id)
      .populate('seller', 'username firstName lastName')
      .populate('winner', 'username firstName lastName');

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Get recent bids for this auction
    const recentBids = await Bid.find({ auction: id })
      .populate('bidder', 'username')
      .sort({ bidTime: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        auction,
        recentBids
      }
    });
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateAuction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if user is the seller
    if (auction.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this auction'
      });
    }

    // Prevent updates if auction has bids
    const bidCount = await Bid.countDocuments({ auction: id });
    if (bidCount > 0 && auction.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update auction with existing bids'
      });
    }

    const updatedAuction = await Auction.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('seller', 'username firstName lastName');

    res.json({
      success: true,
      message: 'Auction updated successfully',
      data: { auction: updatedAuction }
    });
  } catch (error) {
    console.error('Update auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if user is the seller or admin
    if (auction.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this auction'
      });
    }

    // Check if auction has bids
    const bidCount = await Bid.countDocuments({ auction: id });
    if (bidCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auction with existing bids'
      });
    }

    await Auction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Auction deleted successfully'
    });
  } catch (error) {
    console.error('Delete auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUserAuctions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { seller: userId };
    if (status) query.status = status;

    const auctions = await Auction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Auction.countDocuments(query);

    res.json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export {
  createAuction,
  getAllAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
  getUserAuctions
};