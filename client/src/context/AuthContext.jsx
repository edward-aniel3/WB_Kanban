import { createContext, useContext, useReducer, useEffect } from "react";
import { login as loginApi, logout as logoutApi, getMe } from "../services/authService";

const AuthContext = createContext(null);

const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: check for existing cookie and hydrate user
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await getMe();
        if (response.data.success) {
          dispatch({ type: "SET_USER", payload: response.data.user });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } catch {
        dispatch({ type: "LOGOUT" });
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await loginApi(email, password);
    const { user } = response.data;

    dispatch({ type: "LOGIN_SUCCESS", payload: user });
    return user;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Proceed with local logout even if server call fails
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  const value = {
    user: state.user,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
