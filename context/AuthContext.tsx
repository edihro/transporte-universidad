import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Asegúrate de que esta ruta a tu cliente de Supabase sea correcta
import { supabase } from '../context/supabase_client'; 
import { User, Session } from '@supabase/supabase-js';

// 1. Define la forma completa de tu contexto
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean; // Añadimos un estado de carga
  logout: () => Promise<void>;
  // Puedes añadir 'login' aquí si quieres, pero lo mantendremos simple
  // y lo manejarás desde la pantalla de Login por ahora.
}

// 2. Crea el contexto (iniciando como undefined para un mejor chequeo)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Crea el AuthProvider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inicia cargando

  useEffect(() => {
    setIsLoading(true);
    // 4. Revisa la sesión activa cuando la app carga
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthContext (getSession):", error.message);
          throw error;
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (e) {
        console.error("AuthContext (fetchSession catch):", e);
      } finally {
        setIsLoading(false); // Termina la carga inicial
      }
    };

    fetchSession();

    // 5. Escucha los cambios de autenticación (Login, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Este listener se dispara en SIGN_IN, SIGN_OUT, TOKEN_REFRESHED
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // 6. Limpia el listener cuando el componente se desmonta
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // 7. Define la función de logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error.message);
    }
    // El listener onAuthStateChange se encargará de poner user/session a null
  };

  // 8. Pasa los valores al Provider
  const value = {
    user,
    session,
    isLoading,
    logout,
  };

  // No renderiza a los hijos hasta que la sesión inicial se haya verificado
  // Esto evita el "parpadeo" o que se muestre la app antes de saber si está logueado
  return (
    <AuthContext.Provider value={value}>
      {!isLoading ? children : null /* O un <ActivityIndicator> global */}
    </AuthContext.Provider>
  );
};

// 9. Exporta el hook 'useAuth'
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};