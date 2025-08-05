const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const bidController = require('../controllers/bidController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation middleware
const placeBidValidation = [
  param('auctionId')
    .isMongoId()
    .withMessage('Invalid auction ID'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Bid amount must be a positive number')
];

const auctionIdValidation = [
  param('auctionId')
    .isMongoId()
    .withMessage('Invalid auction ID')
];

const bidIdValidation = [
  param('bidId')
    .isMongoId()
    .withMessage('Invalid bid ID')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status')
];

// All bid routes require authentication
router.use(authenticateToken);

// Routes for placing and managing bids
router.post('/:auctionId', 
  requireRole(['buyer', 'seller', 'admin']), 
  placeBidValidation, 
  bidController.placeBid
);

// Routes for viewing bids
router.get('/auction/:auctionId', 
  auctionIdValidation, 
  queryValidation, 
  bidController.getAuctionBids
);

router.get('/user/my-bids', 
  queryValidation, 
  bidController.getUserBids
);

router.get('/user/winning', 
  queryValidation, 
  bidController.getWinningBids
);

router.get('/:bidId', 
  bidIdValidation, 
  bidController.getBidHistory
);

module.exports = router;