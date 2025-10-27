# Online Auction Management System

A full-stack web application for managing online auctions with real-time bidding, user authentication, and comprehensive auction management features.

## 🚀 Features

### User Management
- User registration and authentication
- Role-based access control (Buyer, Seller, Admin)
- Profile management
- Secure JWT-based authentication

### Auction Management
- Create and manage auctions
- Category-based organization
- Image upload support
- Auction status tracking (Pending, Active, Completed, Cancelled)
- Reserve price setting

### Bidding System
- Real-time bidding
- Bid history tracking
- Automatic bid validation
- Winner determination
- Bid notifications

### Security Features
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Styling framework
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd online-auction-management
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install

   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Configure environment variables**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/auction_db
   JWT_SECRET=your-super-secret-jwt-key-here
   CLIENT_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

6. **Run the application**
   ```bash
   # Development mode (runs both server and client)
   npm run dev

   # Or run separately
   # Terminal 1: Start server
   npm run server

   # Terminal 2: Start client
   npm run client
   ```

## 🔧 Development

### Project Structure
```
online-auction-management/
├── server/                 # Backend application
│   ├── config/            # Database and configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── index.js          # Server entry point
├── client/               # Frontend application
│   ├── public/           # Static files
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── App.js        # Main app component
│   └── package.json
├── package.json          # Server dependencies
├── .env.example         # Environment template
└── README.md
```

### Available Scripts

#### Server Scripts
- `npm start` - Start production server
- `npm run server` - Start development server with nodemon
- `npm run dev` - Start both server and client concurrently

#### Client Scripts
- `npm run client` - Start React development server
- `npm run build` - Build client for production
- `npm run install-client` - Install client dependencies
- `npm run install-all` - Install both server and client dependencies

## 🔐 API Endpoints

### Authentication Routes
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update user profile
```

### Auction Routes
```
GET    /api/auctions           # Get all auctions (public)
GET    /api/auctions/:id       # Get auction by ID (public)
POST   /api/auctions           # Create auction (seller/admin)
PUT    /api/auctions/:id       # Update auction (seller/admin)
DELETE /api/auctions/:id       # Delete auction (seller/admin)
GET    /api/auctions/user/my-auctions  # Get user's auctions
```

### Bid Routes
```
POST /api/bids/:auctionId           # Place a bid
GET  /api/bids/auction/:auctionId   # Get auction bids
GET  /api/bids/user/my-bids         # Get user's bids
GET  /api/bids/user/winning         # Get user's winning bids
GET  /api/bids/:bidId               # Get bid details
```

## 🔒 Security Features

### Input Validation
- Email format validation
- Password strength requirements
- Auction data validation
- Bid amount validation

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control
- Protected routes
- Token expiration handling

### Security Middleware
- Helmet for security headers
- CORS configuration
- Rate limiting
- Request size limits

## 🚀 Deployment

### Production Build
```bash
# Build client
cd client && npm run build

# Start production server
NODE_ENV=production npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-production-secret-key
CLIENT_URL=https://your-domain.com
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 5000
   lsof -ti:5000 | xargs kill -9
   ```

2. **MongoDB connection failed**
   - Ensure MongoDB is running
   - Check connection string in .env
   - Verify database permissions

3. **Module not found errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **CORS errors**
   - Check CLIENT_URL in .env
   - Verify CORS configuration in server/index.js

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔮 Future Enhancements

- [ ] Real-time notifications with Socket.io
- [ ] Payment integration
- [ ] Image upload and management
- [ ] Advanced search and filtering
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Auction scheduling
- [ ] Mobile responsive design improvements
- [ ] PWA features
- [ ] Analytics and reporting

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

Built with ❤️ for the online auction community