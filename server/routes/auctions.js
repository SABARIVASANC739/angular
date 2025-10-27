import express from 'express';
import { body, param, query } from 'express-validator';

// Import controllers and middleware
import * as auctionController from '../controllers/auctionController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const createAuctionValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('category')
    .isIn(['electronics', 'art', 'collectibles', 'vehicles', 'jewelry', 'furniture', 'books', 'other'])
    .withMessage('Invalid category'),
  
  body('startingPrice')
    .isFloat({ min: 0 })
    .withMessage('Starting price must be a positive number'),
  
  body('reservePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reserve price must be a positive number'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Invalid start time format'),
  
  body('endTime')
    .isISO8601()
    .withMessage('Invalid end time format')
];

const updateAuctionValidation = [
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('category')
    .optional()
    .isIn(['electronics', 'art', 'collectibles', 'vehicles', 'jewelry', 'furniture', 'books', 'other'])
    .withMessage('Invalid category'),
  
  body('startingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Starting price must be a positive number'),
  
  body('reservePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reserve price must be a positive number')
];

const auctionIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid auction ID')
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
  
  query('category')
    .optional()
    .isIn(['electronics', 'art', 'collectibles', 'vehicles', 'jewelry', 'furniture', 'books', 'other'])
    .withMessage('Invalid category'),
  
  query('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('sortBy')
    .optional()
    .isIn(['endTime', 'startTime', 'currentPrice', 'totalBids', 'createdAt'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Public routes (no authentication required)
router.get('/', queryValidation, auctionController.getAllAuctions);
router.get('/:id', auctionIdValidation, auctionController.getAuctionById);

// Protected routes (authentication required)
router.use(authenticateToken);

// Routes for sellers and admins
router.post('/', 
  requireRole(['seller', 'admin']), 
  createAuctionValidation, 
  auctionController.createAuction
);

router.put('/:id', 
  requireRole(['seller', 'admin']), 
  auctionIdValidation, 
  updateAuctionValidation, 
  auctionController.updateAuction
);

router.delete('/:id', 
  requireRole(['seller', 'admin']), 
  auctionIdValidation, 
  auctionController.deleteAuction
);

// Route for users to get their own auctions
router.get('/user/my-auctions', 
  requireRole(['seller', 'admin']), 
  queryValidation, 
  auctionController.getUserAuctions
);

export default router;