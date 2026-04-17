import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  teams: any[];
  selectedTeam: any | null;
  setSelectedTeam: (team: any) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const res = await api.get('/api/auth/me');
          setDbUser(res.data.user);
          setTeams(res.data.teams || []);
          if (res.data.teams && res.data.teams.length > 0) {
            setSelectedTeam(res.data.teams[0]);
          } else {
            setSelectedTeam(null);
          }
        } catch (error) {
          console.error("Auth me error", error);
        }
      } else {
        setDbUser(null);
        setTeams([]);
        setSelectedTeam(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUser, teams, selectedTeam, setSelectedTeam, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
