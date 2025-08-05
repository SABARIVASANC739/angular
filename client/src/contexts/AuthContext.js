import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true
};

// Action types
const actionTypes = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  SET_LOADING: 'SET_LOADING',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case actionTypes.LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    
    case actionTypes.LOAD_USER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false
      };
    
    case actionTypes.UPDATE_PROFILE:
      return {
        ...state,
        user: action.payload.user
      };
    
    case actionTypes.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await api.get('/auth/profile');
          if (response.data.success) {
            dispatch({
              type: actionTypes.LOAD_USER,
              payload: response.data.data
            });
          } else {
            dispatch({ type: actionTypes.LOGOUT });
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          dispatch({ type: actionTypes.LOGOUT });
        }
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    loadUser();
  }, []);

  // Auth actions
  const login = async (email, password) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        dispatch({
          type: actionTypes.LOGIN_SUCCESS,
          payload: response.data.data
        });
        return { success: true };
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      const response = await api.post('/auth/register', userData);

      if (response.data.success) {
        dispatch({
          type: actionTypes.LOGIN_SUCCESS,
          payload: response.data.data
        });
        return { success: true };
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);

      if (response.data.success) {
        dispatch({
          type: actionTypes.UPDATE_PROFILE,
          payload: response.data.data
        });
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed'
      };
    }
  };

  const logout = () => {
    dispatch({ type: actionTypes.LOGOUT });
  };

  const value = {
    ...state,
    login,
    register,
    updateProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;