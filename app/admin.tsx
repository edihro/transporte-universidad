import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
// Importamos 'Bus' para el icono de la unidad
import { Plus, User, Trash2, AlertTriangle, Truck, Bus } from 'lucide-react-native';
import { supabase } from '../context/supabase_client';
import { useUser } from '../context/UserContext';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';
const DANGER_COLOR = '#EF4444';

export default function AdminPanel() {
    const router = useRouter();
    const { user } = useUser();
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        contraseña: '',
        rol: 'conductor', // 'conductor' o 'administrador'
    });

    // Protección: Verificar si el usuario es administrador
    useEffect(() => {
        if (user?.type !== 'administrador') {
            Alert.alert(
                'Acceso Denegado',
                'No tienes permisos para acceder a esta sección.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        }
    }, [user]);

    // Si no es administrador, mostrar pantalla de acceso denegado
    if (user?.type !== 'administrador') {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    headerShown: true,
                    title: 'Acceso Denegado',
                    headerStyle: { backgroundColor: DANGER_COLOR },
                    headerTintColor: 'white',
                }} />
                <View style={styles.accessDeniedContainer}>
                    <AlertTriangle size={64} color={DANGER_COLOR} />
                    <Text style={styles.accessDeniedTitle}>Acceso Denegado</Text>
                    <Text style={styles.accessDeniedText}>
                        No tienes permisos para acceder a esta sección.
                        Solo los administradores pueden gestionar usuarios.
                    </Text>
                    <Pressable 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Regresar</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const crearUsuario = async () => {
        if (!formData.nombre || !formData.email || !formData.contraseña) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }
        if (formData.contraseña.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Crear usuario en Auth
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.contraseña,
            });

            if (error) throw error;

            if (!data.user?.id) {
                throw new Error('No se pudo crear el usuario');
            }

            // 2. Crear perfil con el rol seleccionado
            const { error: profileError } = await supabase
                .from('perfiles')
                .insert([{
                    id: data.user.id,
                    email: formData.email,
                    nombre_usuario: formData.nombre,
                    rol: formData.rol,
                    estado: 'activo'
                }]);

            if (profileError) {
                await supabase.auth.admin.deleteUser(data.user.id);
                throw profileError;
            }

            Alert.alert('Éxito', `${formData.rol.charAt(0).toUpperCase() + formData.rol.slice(1)} creado correctamente`);
            setFormData({ nombre: '', email: '', contraseña: '', rol: 'conductor' });
            setIsCreatingUser(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Error al crear usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Panel de Administrador',
                headerStyle: { backgroundColor: PRIMARY_COLOR },
                headerTintColor: 'white',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Gestión General</Text>
                    <Text style={styles.headerSubtitle}>Administra rutas, unidades y usuarios</Text>
                </View>

                {/* --- SECCIÓN DE GESTIÓN (BOTONES GRANDES) --- */}
                <View style={styles.managementGrid}>
                    <Pressable 
                        style={styles.managementButton}
                        onPress={() => router.push('/crear-viaje')} 
                    >
                        <Truck size={32} color="white" />
                        <Text style={styles.managementButtonText}>Gestionar Rutas</Text>
                    </Pressable>

                    {/* CORRECCIÓN: La ruta debe coincidir con el nombre del archivo 'CrearUnidadScreen.tsx' */}
                    <Pressable 
                        style={[styles.managementButton, { backgroundColor: '#8B5CF6' }]}
                        onPress={() => router.push('/CrearUnidadScreen')} 
                    >
                        <Bus size={32} color="white" />
                        <Text style={styles.managementButtonText}>Registrar Unidad</Text>
                    </Pressable>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Gestión de Usuarios</Text>

                {!isCreatingUser ? (
                    <Pressable 
                        style={[styles.floatingButton, {backgroundColor: '#10B981'}]} 
                        onPress={() => setIsCreatingUser(true)}
                    >
                        <Plus size={28} color="white" />
                        <Text style={styles.floatingButtonText}>Crear Nuevo Usuario</Text>
                    </Pressable>
                ) : (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Nuevo Usuario</Text>

                        <View>
                            <Text style={styles.label}>Nombre de Usuario</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.nombre}
                                onChangeText={(text) => handleChange('nombre', text)}
                                placeholder="ej: juan_conductor"
                                autoCapitalize="none"
                            />
                        </View>

                        <View>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(text) => handleChange('email', text)}
                                placeholder="usuario@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View>
                            <Text style={styles.label}>Contraseña Temporal</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.contraseña}
                                onChangeText={(text) => handleChange('contraseña', text)}
                                placeholder="Mínimo 6 caracteres"
                                secureTextEntry
                            />
                        </View>

                        <View>
                            <Text style={styles.label}>Tipo de Usuario</Text>
                            <View style={styles.rolContainer}>
                                <Pressable
                                    style={[
                                        styles.rolButton,
                                        formData.rol === 'conductor' && styles.rolButtonActive
                                    ]}
                                    onPress={() => handleChange('rol', 'conductor')}
                                >
                                    <Text style={[
                                        styles.rolButtonText,
                                        formData.rol === 'conductor' && styles.rolButtonTextActive
                                    ]}>
                                        Conductor
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.rolButton,
                                        formData.rol === 'administrador' && styles.rolButtonActive
                                    ]}
                                    onPress={() => handleChange('rol', 'administrador')}
                                >
                                    <Text style={[
                                        styles.rolButtonText,
                                        formData.rol === 'administrador' && styles.rolButtonTextActive
                                    ]}>
                                        Admin
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => {
                                    setIsCreatingUser(false);
                                    setFormData({ nombre: '', email: '', contraseña: '', rol: 'conductor' });
                                }}
                                disabled={isLoading}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.createButton}
                                onPress={crearUsuario}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Plus size={20} color="white" />
                                        <Text style={styles.createButtonText}>Crear</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>ℹ️ Información</Text>
                    <Text style={styles.infoText}>
                        • Los usuarios serán creados en el sistema{'\n'}
                        • Se enviará un email de verificación{'\n'}
                        • Los conductores pueden publicar rutas{'\n'}
                        • Los administradores pueden gestionar usuarios{'\n'}
                        • Registra las unidades antes de asignarlas a rutas
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 15,
    },
    managementGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 10,
    },
    managementButton: {
        flex: 1,
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        gap: 10,
    },
    managementButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    floatingButton: {
        flexDirection: 'row',
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    floatingButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        fontSize: 14,
    },
    rolContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    rolButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        alignItems: 'center',
    },
    rolButtonActive: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    rolButtonText: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 14,
    },
    rolButtonTextActive: {
        color: 'white',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: PRIMARY_COLOR,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: PRIMARY_COLOR,
        fontWeight: '600',
        fontSize: 14,
    },
    createButton: {
        flex: 1,
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    createButtonText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 8,
    },
    infoBox: {
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 4,
        borderLeftColor: ACCENT_COLOR,
        padding: 16,
        borderRadius: 8,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 20,
    },
    accessDeniedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    accessDeniedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: DANGER_COLOR,
        marginTop: 20,
        marginBottom: 10,
    },
    accessDeniedText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    backButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});