import React, { createContext, useState, useContext, useEffect } from "react";
import API from "../utils/api";
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (userData, token) => {
    const fullUser = { ...userData, plan: userData?.plan || "basic" };
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(fullUser));
    setUser(fullUser);
    return fullUser;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) { try { setUser(JSON.parse(storedUser)); } catch { localStorage.removeItem("user"); localStorage.removeItem("token"); } }
    setLoading(false);
  }, []);

  const login = async (emailOrUser, passwordOrToken, role) => {
    if (typeof emailOrUser === "object" && emailOrUser !== null) {
      return persistUser(emailOrUser, passwordOrToken);
    }

    const res = await API.post("/auth/login", { email: emailOrUser, password: passwordOrToken, role });
    const { token, user: userData, plan, ...rest } = res.data;
    return persistUser(userData ? { ...userData, plan } : { ...rest, plan }, token);
  };

  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); };
  const getPlan = () => user?.plan || "basic";
  return <AuthContext.Provider value={{ user, login, logout, loading, getPlan }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; };
