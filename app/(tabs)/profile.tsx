import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, Image, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { UserCircle2, Shield, Truck, Settings, LogOut, Edit2, Save, X, Camera } from 'lucide-react-native'; 
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../context/supabase_client';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

export default function ProfileScreen() {
    const { onLogout } = useAuth();
    const { user, setUser } = useUser();
    const router = useRouter();
    
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Estados para edición
    const [editedName, setEditedName] = useState(user?.name || 'Usuario');
    const [editedPhone, setEditedPhone] = useState(user?.phone || '');
    const [editedBio, setEditedBio] = useState(user?.bio || '');
    const [profileImage, setProfileImage] = useState(user?.profileImage || null);
    
    const userName = user?.name || 'Usuario';
    const userType = user?.type || 'pasajero';
    const userPhone = user?.phone || 'Sin teléfono';
    const userBio = user?.bio || 'Sin biografía';

    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres cerrar tu sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sí", 
                    onPress: () => {
                        if (onLogout && typeof onLogout === 'function') {
                            onLogout();
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        try {
            // Solicitar permisos
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Permiso Denegado', 'Necesitamos acceso a tus fotos para cambiar tu imagen de perfil.');
                return;
            }

            // Abrir galería
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la imagen');
        }
    };

    const handleSaveProfile = async () => {
        if (!editedName.trim()) {
            Alert.alert('Error', 'El nombre no puede estar vacío');
            return;
        }

        setIsSaving(true);
        
        try {
            // Actualizar en Supabase
            const { error } = await supabase
                .from('perfiles')
                .update({
                    nombre_usuario: editedName,
                    telefono: editedPhone,
                    biografia: editedBio,
                    // foto_perfil: profileImage (implementar upload después)
                })
                .eq('id', user?.uid);

            if (error) {
                throw error;
            }

            // Actualizar contexto local
            setUser({
                ...user,
                name: editedName,
                phone: editedPhone,
                bio: editedBio,
                profileImage: profileImage,
            });

            Alert.alert('Éxito', 'Perfil actualizado correctamente');
            setIsEditing(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedName(user?.name || 'Usuario');
        setEditedPhone(user?.phone || '');
        setEditedBio(user?.bio || '');
        setProfileImage(user?.profileImage || null);
        setIsEditing(false);
    };

    const renderUserSpecificContent = () => {
        const BaseIconProps = { size: 20, color: 'white' };

        switch (userType) {
            case 'conductor':
                return (
                    <View style={styles.card}>
                        <Text style={styles.roleTitle}>Funciones de Conductor</Text>
                        <Pressable style={styles.button} onPress={() => Alert.alert("Conductor", "Crear una nueva publicación de ruta")}>
                            <Truck {...BaseIconProps} />
                            <Text style={styles.buttonText}>Publicar Nueva Ruta</Text>
                        </Pressable>
                        <Pressable style={styles.button} onPress={() => Alert.alert("Conductor", "Activar/Desactivar ubicación")}>
                            <Settings {...BaseIconProps} />
                            <Text style={styles.buttonText}>Control de Ubicación</Text>
                        </Pressable>
                    </View>
                );
            case 'administrador':
                return (
                    <View style={styles.card}>
                        <Text style={styles.roleTitle}>Panel de Administrador</Text>
                        <Pressable style={styles.button} onPress={() => router.push('/admin')}>
                            <Shield {...BaseIconProps} />
                            <Text style={styles.buttonText}>Gestionar Usuarios</Text>
                        </Pressable>
                        <Pressable style={styles.button} onPress={() => Alert.alert("Admin", "Ver reportes")}>
                            <Settings {...BaseIconProps} />
                            <Text style={styles.buttonText}>Reportes del Sistema</Text>
                        </Pressable>
                    </View>
                );
            default:
                return (
                    <View style={styles.card}>
                        <Text style={styles.roleTitle}>Acciones Rápidas</Text>
                        <Pressable style={styles.button} onPress={() => router.push('/reservations')}>
                            <Truck {...BaseIconProps} />
                            <Text style={styles.buttonText}>Ver mis Reservas</Text>
                        </Pressable>
                        <Pressable style={styles.button} onPress={() => router.push('/settings')}>
                            <Settings {...BaseIconProps} />
                            <Text style={styles.buttonText}>Configuración de Cuenta</Text>
                        </Pressable>
                    </View>
                );
        }
    };

    return (
        <ScrollView style={styles.scrollContainer}>
            <View style={styles.container}>
                <Stack.Screen options={{ 
                    headerShown: true, 
                    title: 'Mi Perfil',
                    headerStyle: { backgroundColor: PRIMARY_COLOR },
                    headerTintColor: 'white',
                    headerRight: () => (
                        !isEditing ? (
                            <Pressable onPress={() => setIsEditing(true)} style={styles.headerButton}>
                                <Edit2 size={22} color="white" />
                            </Pressable>
                        ) : null
                    ),
                }} />

                <View style={styles.profileHeader}>
                    {/* Foto de Perfil */}
                    <View style={styles.profileImageContainer}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <UserCircle2 size={120} color={ACCENT_COLOR} />
                        )}
                        
                        {isEditing && (
                            <Pressable style={styles.cameraButton} onPress={pickImage}>
                                <Camera size={24} color="white" />
                            </Pressable>
                        )}
                    </View>

                    {/* Información Editable */}
                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <Text style={styles.inputLabel}>Nombre</Text>
                            <TextInput
                                style={styles.input}
                                value={editedName}
                                onChangeText={setEditedName}
                                placeholder="Nombre de usuario"
                            />

                            <Text style={styles.inputLabel}>Teléfono</Text>
                            <TextInput
                                style={styles.input}
                                value={editedPhone}
                                onChangeText={setEditedPhone}
                                placeholder="Número de teléfono"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.inputLabel}>Biografía</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editedBio}
                                onChangeText={setEditedBio}
                                placeholder="Cuéntanos algo sobre ti..."
                                multiline
                                numberOfLines={3}
                            />

                            <View style={styles.editButtonsContainer}>
                                <Pressable 
                                    style={[styles.editButton, styles.saveButton]} 
                                    onPress={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    <Save size={18} color="white" />
                                    <Text style={styles.editButtonText}>
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                    </Text>
                                </Pressable>

                                <Pressable 
                                    style={[styles.editButton, styles.cancelButton]} 
                                    onPress={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    <X size={18} color="white" />
                                    <Text style={styles.editButtonText}>Cancelar</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.infoContainer}>
                            <Text style={styles.userName}>{userName}</Text>
                            <Text style={styles.userRole}>
                                <Text style={styles.roleLabel}>ROL:</Text> {userType.toUpperCase()}
                            </Text>
                            
                            <View style={styles.additionalInfoContainer}>
                                <Text style={styles.infoLabel}>Teléfono:</Text>
                                <Text style={styles.infoText}>{userPhone}</Text>
                                
                                <Text style={styles.infoLabel}>Bio:</Text>
                                <Text style={styles.infoText}>{userBio}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {!isEditing && renderUserSpecificContent()}

                {!isEditing && (
                    <Pressable style={styles.logoutButton} onPress={handleLogout}>
                        <LogOut size={20} color="white" />
                        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                    </Pressable>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    headerButton: {
        marginRight: 15,
        padding: 5,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: ACCENT_COLOR,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: ACCENT_COLOR,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    infoContainer: {
        width: '100%',
        alignItems: 'center',
    },
    userName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginTop: 10,
        textAlign: 'center',
    },
    userRole: {
        fontSize: 18,
        color: '#666',
        marginTop: 5,
        fontWeight: '600',
    },
    roleLabel: {
        color: PRIMARY_COLOR,
        fontWeight: '700',
    },
    additionalInfoContainer: {
        width: '100%',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginTop: 12,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 16,
        color: '#4B5563',
        marginBottom: 8,
    },
    editContainer: {
        width: '100%',
        marginTop: 10,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_COLOR,
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    editButtonsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    saveButton: {
        backgroundColor: '#10B981',
    },
    cancelButton: {
        backgroundColor: '#6B7280',
    },
    editButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 20,
    },
    roleTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 15,
        textAlign: 'left',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#EF4444',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    logoutButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        marginLeft: 10,
    }
});