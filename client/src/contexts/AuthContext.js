import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/users/profile');
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: response.data,
              token: token,
            },
          });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_ERROR', payload: 'Session expired' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.post('/users/login', { email, password });
      
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      return { success: true };
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.response?.data?.error || 'Login failed',
      });
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.post('/users/register', userData);
      
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      return { success: true };
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.response?.data?.error || 'Registration failed',
      });
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
