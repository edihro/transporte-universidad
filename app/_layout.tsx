import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack, Tabs } from 'expo-router'; 
import { Eye, EyeOff, Home, BusFront, User } from 'lucide-react-native'; 
import { supabase, registrarPerfilUsuario } from '../context/supabase_client';
import { AuthProvider } from '../context/AuthContext';
import { UserProvider, useUser } from '../context/UserContext';

const PRIMARY_COLOR = '#1C3F60'; 
const ACCENT_COLOR = '#3B82F6';

type UserType = 'pasajero' | 'conductor' | 'administrador' | null;

interface LoggedInUser { 
    name: string; 
    type: UserType;
    uid: string;
    phone?: string;
    bio?: string;
    profileImage?: string;
}

interface TabScreensProps {
    loggedInUser: LoggedInUser;
    onLogout: () => void;
}

const TabScreens = ({ loggedInUser, onLogout }: TabScreensProps) => {
    return (
        <Tabs screenOptions={{
            headerShown: false, 
            tabBarActiveTintColor: PRIMARY_COLOR,
            tabBarLabelStyle: { fontWeight: '600' },
            tabBarStyle: { height: 65, paddingVertical: 5 },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Publicaciones',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Rutas',
                    tabBarIcon: ({ color }) => <BusFront color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
            <Tabs.Screen name="modal" options={{ href: null }} /> 
        </Tabs>
    );
};

// Componente que maneja el login y usa useUser
function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        usuario: '',
        contraseña: '',
        confirmarContraseña: '',
        email: '',
    });
    
    const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
    const { setUser } = useUser();

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleIniciarSesion = async () => {
        if (!formData.usuario || !formData.contraseña) {
            Alert.alert('Error', 'Por favor, ingresa email y contraseña.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.usuario,
                password: formData.contraseña,
            });

            if (error) {
                Alert.alert('Error de Login', error.message || 'Credenciales inválidas');
                setIsLoading(false);
                return;
            }

            if (!data.user?.id) {
                Alert.alert('Error', 'No se pudo obtener el ID del usuario');
                setIsLoading(false);
                return;
            }

            // ⭐ ACTUALIZADO: Cargar los nuevos campos del perfil
            const { data: profileData, error: profileError } = await supabase
                .from('perfiles')
                .select('nombre_usuario, rol_id, telefono, biografia, foto_perfil')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                Alert.alert('Error', 'No se pudo obtener el perfil del usuario: ' + profileError.message);
                setIsLoading(false);
                return;
            }

            let userType: UserType = 'pasajero';
            if (profileData?.rol_id === 2) {
                userType = 'conductor';
            } else if (profileData?.rol_id === 3) {
                userType = 'administrador';
            }

            // ⭐ ACTUALIZADO: Incluir los nuevos campos en userData
            const userData = {
                name: profileData?.nombre_usuario || 'Usuario',
                type: userType,
                uid: data.user.id,
                phone: profileData?.telefono || '',
                bio: profileData?.biografia || '',
                profileImage: profileData?.foto_perfil || null,
            };

            setLoggedInUser(userData);
            setUser(userData);

            setFormData({ usuario: '', contraseña: '', confirmarContraseña: '', email: '' });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Ocurrió un error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegistro = async () => {
        if (!formData.usuario || !formData.email || !formData.contraseña || !formData.confirmarContraseña) {
            Alert.alert('Error', 'Por favor, completa todos los campos.');
            return;
        }

        if (formData.contraseña !== formData.confirmarContraseña) {
            Alert.alert('Error', 'Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.contraseña,
            });

            if (error) {
                Alert.alert('Error en Registro', error.message || 'No se pudo registrar el usuario');
                setIsLoading(false);
                return;
            }

            if (!data.user?.id) {
                Alert.alert('Error', 'No se pudo obtener el ID del usuario');
                setIsLoading(false);
                return;
            }

            // Registrar perfil con nombre_usuario
            const profileResult = await registrarPerfilUsuario(
                data.user.id, 
                formData.usuario,  // Esto es el nombre_usuario
                'pasajero',
                formData.usuario   // nombre_completo también usa el username
            );

            if (profileResult.error) {
                Alert.alert('Error al guardar perfil', profileResult.error.message || 'No se pudo guardar el perfil');
                setIsLoading(false);
                return;
            }

            Alert.alert('Registro Exitoso', '¡Tu cuenta ha sido creada! Revisa tu email para confirmarla.');
            setIsLogin(true);
            setFormData({ usuario: '', contraseña: '', confirmarContraseña: '', email: '' });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Ocurrió un error al registrar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCerrarSesion = async () => {
        try {
            await supabase.auth.signOut();
            setLoggedInUser(null);
            setUser(null);
            setFormData({ usuario: '', contraseña: '', confirmarContraseña: '', email: '' });
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo cerrar la sesión');
        }
    };

    const handleRecuperarContraseña = async () => {
        if (!formData.usuario) {
            Alert.alert('Error', 'Ingresa tu email para recuperar la contraseña');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.usuario);
            
            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Éxito', 'Se envió un enlace de recuperación a tu email');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (loggedInUser) {
        return (
            <AuthProvider onLogout={handleCerrarSesion}>
                <TabScreens loggedInUser={loggedInUser} onLogout={handleCerrarSesion} />
            </AuthProvider>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.fullWidthCard}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Transporte UTEsc</Text>
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.tabsContainer}>
                        <Pressable
                            onPress={() => setIsLogin(true)}
                            style={isLogin ? styles.activeTab : styles.inactiveTab}
                        >
                            <Text style={isLogin ? styles.activeTabText : styles.inactiveTabText}>
                                Iniciar Sesión
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setIsLogin(false)}
                            style={!isLogin ? styles.activeTab : styles.inactiveTab}
                        >
                            <Text style={!isLogin ? styles.activeTabText : styles.inactiveTabText}>
                                Registrarse
                            </Text>
                        </Pressable>
                    </View>

                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                            <Text style={styles.loadingText}>Procesando...</Text>
                        </View>
                    )}

                    {!isLoading && isLogin ? (
                        <View style={styles.formSection}>
                            <View>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.usuario}
                                    onChangeText={(text) => handleChange('usuario', text)}
                                    placeholder="Ingresa tu email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View>
                                <Text style={styles.label}>Contraseña</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showPassword}
                                        value={formData.contraseña}
                                        onChangeText={(text) => handleChange('contraseña', text)}
                                        placeholder="Ingresa tu contraseña"
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                                    </Pressable>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleIniciarSesion}
                                style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.8 }]}
                            >
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            </Pressable>

                            <View style={styles.linkContainer}>
                                <Text
                                    onPress={handleRecuperarContraseña} 
                                    style={styles.forgotPasswordLink} 
                                >
                                    ¿Olvidaste tu contraseña?
                                </Text>
                            </View>
                        </View>
                    ) : !isLoading ? (
                        <View style={styles.formSection}>
                            <View>
                                <Text style={styles.label}>Usuario</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.usuario}
                                    onChangeText={(text) => handleChange('usuario', text)}
                                    placeholder="Elige un usuario"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="email-address"
                                    value={formData.email}
                                    onChangeText={(text) => handleChange('email', text)}
                                    placeholder="Ingresa tu email"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View>
                                <Text style={styles.label}>Contraseña</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showPassword}
                                        value={formData.contraseña}
                                        onChangeText={(text) => handleChange('contraseña', text)}
                                        placeholder="Crea una contraseña"
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                                    </Pressable>
                                </View>
                            </View>

                            <View>
                                <Text style={styles.label}>Confirmar Contraseña</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showConfirmPassword}
                                        value={formData.confirmarContraseña}
                                        onChangeText={(text) => handleChange('confirmarContraseña', text)}
                                        placeholder="Confirma tu contraseña"
                                    />
                                    <Pressable
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeButton}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                                    </Pressable>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleRegistro}
                                style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.8 }]}
                            >
                                <Text style={styles.buttonText}>Registrarse</Text>
                            </Pressable>

                            <Text style={styles.switchText}>
                                ¿Ya tienes cuenta?{' '}
                                <Text
                                    onPress={() => setIsLogin(true)}
                                    style={styles.switchLink}
                                >
                                    Inicia sesión aquí
                                </Text>
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

// Componente principal que envuelve todo con UserProvider
export default function TabLayout() {
    return (
        <UserProvider>
            <LoginScreen />
        </UserProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6', 
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16, 
    },
    fullWidthCard: {
        width: '100%',
        maxWidth: 400, 
    },
    header: {
        backgroundColor: PRIMARY_COLOR, 
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        padding: 24, 
        alignItems: 'center', 
    },
    headerText: {
        fontSize: 24, 
        fontWeight: '700', 
        color: 'white',
    },
    mainContent: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        padding: 32, 
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 8, 
        marginBottom: 32, 
    },
    activeTab: {
        flex: 1,
        paddingVertical: 10, 
        paddingHorizontal: 16, 
        borderRadius: 8, 
        backgroundColor: PRIMARY_COLOR, 
    },
    inactiveTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#E5E7EB', 
    },
    activeTabText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600',
    },
    inactiveTabText: {
        color: '#4B5563', 
        textAlign: 'center',
        fontWeight: '600',
    },
    formSection: {
        gap: 16, 
    },
    label: {
        color: '#4B5563', 
        fontWeight: '600', 
        marginBottom: 8, 
    },
    input: {
        width: '100%',
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderWidth: 2,
        borderColor: '#D1D5DB', 
        borderRadius: 8,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingRight: 12,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    eyeButton: {
        padding: 5,
    },
    submitButton: {
        width: '100%',
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14, 
        borderRadius: 8,
        marginTop: 24, 
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
        fontSize: 16,
    },
    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    switchText: {
        color: '#4B5563', 
        fontSize: 14, 
        textAlign: 'center'
    },
    switchLink: {
        color: ACCENT_COLOR, 
        fontWeight: '700', 
    },
    forgotPasswordLink: {
        color: ACCENT_COLOR, 
        fontWeight: '600', 
        fontSize: 14,
        textDecorationLine: 'underline', 
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        color: PRIMARY_COLOR,
        fontWeight: '600',
    },
});