import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('neuroscan_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('http://127.0.0.1:5000/api/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setDoctor(data.doctor);
        } else {
          localStorage.removeItem('neuroscan_token');
          setToken(null);
          setDoctor(null);
        }
      } catch {
        // Server not reachable, keep token for retry
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = (tokenStr, doctorData) => {
    localStorage.setItem('neuroscan_token', tokenStr);
    setToken(tokenStr);
    setDoctor(doctorData);
  };

  const logout = () => {
    localStorage.removeItem('neuroscan_token');
    setToken(null);
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{ doctor, token, loading, login, logout, isAuthenticated: !!doctor }}>
      {children}
    </AuthContext.Provider>
  );
};
