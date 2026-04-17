import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { api } from '../api';

type AuthContextType = {
  user: User | null;
  dbUser: any | null;
  team: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, dbUser: null, team: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [team, setTeam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const res = await api.get('/api/auth/me');
          setDbUser(res.data.user);
          setTeam(res.data.team);
        } catch (e) {
          console.error(e);
        }
      } else {
        setDbUser(null);
        setTeam(null);
      }
      setLoading(false);
    });
  }, []);

  return <AuthContext.Provider value={{ user, dbUser, team, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
