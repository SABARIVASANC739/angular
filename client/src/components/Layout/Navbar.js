import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-xl font-bold hover:text-blue-200 transition-colors"
            >
              AuctionHub
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              to="/auctions" 
              className="hover:text-blue-200 transition-colors px-3 py-2 rounded-md"
            >
              Browse Auctions
            </Link>

            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="hover:text-blue-200 transition-colors px-3 py-2 rounded-md"
                >
                  Dashboard
                </Link>
                
                {(user?.role === 'seller' || user?.role === 'admin') && (
                  <Link 
                    to="/create-auction" 
                    className="bg-green-500 hover:bg-green-600 px-3 py-2 rounded-md transition-colors"
                  >
                    Create Auction
                  </Link>
                )}

                <div className="relative group">
                  <button className="flex items-center space-x-1 hover:text-blue-200 transition-colors px-3 py-2 rounded-md">
                    <span>{user?.firstName} {user?.lastName}</span>
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <Link 
                      to="/my-bids" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Bids
                    </Link>
                    {(user?.role === 'seller' || user?.role === 'admin') && (
                      <Link 
                        to="/my-auctions" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        My Auctions
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="hover:text-blue-200 transition-colors px-3 py-2 rounded-md"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-green-500 hover:bg-green-600 px-3 py-2 rounded-md transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;