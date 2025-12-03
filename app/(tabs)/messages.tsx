import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router'; 
import { supabase } from '../../context/supabase_client';
import { useUser } from '../../context/UserContext';
import { UserCircle2, MessageCircle, ArrowLeft, Home } from 'lucide-react-native';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

// --- Header personalizado ---
export const options = () => {
    const router = useRouter();
    return {
        headerShown: true,
        title: 'Mensajes',
        headerStyle: { backgroundColor: PRIMARY_COLOR },
        headerTintColor: 'white',
        headerLeft: () => (
            <Pressable 
                onPress={() => router.push('/(tabs)/index')}
                style={{ marginLeft: 10, padding: 5 }}
            >
                <ArrowLeft size={24} color="white" />
            </Pressable>
        )
    };
};

interface ChatUser {
  id: string;
  nombre_usuario: string;
  foto_perfil: string | null;
  rol_id: number; 
}

const getRoleName = (rol_id: number) => {
    switch (rol_id) {
        case 1: return 'Pasajero';
        case 2: return 'Conductor';
        case 3: return 'Administrador';
        default: return 'Usuario';
    }
};

export default function MessagesScreen() {
    const router = useRouter();
    const { user } = useUser();
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(user) {
            loadUsers();
        }
    }, [user]);

    const loadUsers = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('id, nombre_usuario, foto_perfil, rol_id') 
                .neq('id', user.uid); 

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudieron cargar los usuarios: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const openChat = (receiver: ChatUser) => {
        router.push({
            pathname: `/chat/${receiver.id}`,
            params: { 
                receiverName: receiver.nombre_usuario,
                receiverProfilePic: receiver.foto_perfil || '' 
            }
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Cargando usuarios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.container}>
                <Text style={styles.headerTitle}>Iniciar una Conversación</Text>

                {/* === BOTÓN PARA REGRESAR AL INDEX (ARRIBA) === */}
                    <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                    <Home size={20} color="white" />
                    <Text style={styles.backButtonText}>Volver al inicio</Text>
                </Pressable>

                {users.length === 0 ? (
                    <Text style={styles.loadingText}>No se encontraron otros usuarios.</Text>
                ) : (
                    users.map(chatUser => (
                        <Pressable key={chatUser.id} style={styles.userCard} onPress={() => openChat(chatUser)}>
                            {chatUser.foto_perfil ? (
                                <Image source={{ uri: chatUser.foto_perfil }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <UserCircle2 size={32} color={PRIMARY_COLOR} />
                                </View>
                            )}
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{chatUser.nombre_usuario}</Text>
                                <Text style={styles.userRole}>{getRoleName(chatUser.rol_id)}</Text>
                            </View>
                            <MessageCircle size={24} color={ACCENT_COLOR} />
                        </Pressable>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#6B7280',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 5,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        marginHorizontal: 15,
        marginVertical: 5,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    userRole: {
        fontSize: 13,
        color: '#6B7280',
        textTransform: 'capitalize',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PRIMARY_COLOR,
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 15,
        marginVertical: 10,
    },
    backButtonText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
});
