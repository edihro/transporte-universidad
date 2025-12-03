import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Menu, User, BusFront, Pencil, LogOut, Settings, X, MessageSquare, Send, Map, Plus, Ticket, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import 'react-native-url-polyfill/auto';

// --- Constantes y Tipos ---
const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';
const STORAGE_KEY = '@TransporteUTEsc:publications';

type Comment = {
  id: number;
  user: string;
  authorId: string;
  text: string;
};
type Publication = {
  id: number;
  user: string;
  authorId: string;
  text: string;
  role: string;
  comments: Comment[];
};

const initialPublications: Publication[] = [];


// --- Componente de Comentarios (CommentInput) ---
const CommentInput = ({ postId, onCommentSubmit, currentUser }: {
    postId: number,
    onCommentSubmit: (postId: number, text: string) => void,
    currentUser: string
}) => {
    const [commentText, setCommentText] = useState('');
    const handleSubmit = () => {
        if (commentText.trim()) {
            onCommentSubmit(postId, commentText.trim());
            setCommentText('');
        }
    };

    return (
        <View style={postStyles.commentInputContainer}>
            <TextInput
                style={postStyles.commentTextInput}
                placeholder={`Escribe un comentario, ${currentUser}...`}
                value={commentText}
                onChangeText={setCommentText}
                multiline
            />
            <Pressable
                style={postStyles.commentSendButton}
                onPress={handleSubmit}
                disabled={!commentText.trim()}
            >
                <Send size={20} color={commentText.trim() ? PRIMARY_COLOR : '#9CA3AF'} />
            </Pressable>
        </View>
    );
};


// --- Componente de Publicación (Post) ---
const Post = ({ publication, onPublicComment, onPrivateMessage, onDeletePost, onDeleteComment, currentUser, currentUserRole }: {
    publication: Publication,
    onPublicComment: (postId: number, text: string) => void,
    onPrivateMessage: (authorId: string) => void,
    onDeletePost: (postId: number) => void,
    onDeleteComment: (postId: number, commentId: number) => void,
    currentUser: { name: string, id: string | null },
    currentUserRole: string
}) => {
    const { user, authorId, text, role, id, comments } = publication;
    const [showCommentInput, setShowCommentInput] = useState(false);

    let roleColor = '#4B5563';
    if (role === 'administrador') roleColor = '#EF4444';
    if (role === 'conductor') roleColor = PRIMARY_COLOR;

    const isSelfPost = currentUser.id === authorId;
    const canDeletePost = isSelfPost || currentUserRole === 'administrador';

    const handlePublicComment = () => {
        setShowCommentInput(prev => !prev);
    };

    const handleCommentSubmit = (postId: number, commentText: string) => {
        onPublicComment(postId, commentText);
        setShowCommentInput(false);
    };

    const handleDeletePost = () => {
        Alert.alert(
            'Eliminar Publicación',
            '¿Estás seguro de que quieres eliminar esta publicación?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => onDeletePost(id)
                }
            ]
        );
    };

    const handleDeleteComment = (commentId: number) => {
        Alert.alert(
            'Eliminar Comentario',
            '¿Estás seguro de que quieres eliminar este comentario?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => onDeleteComment(id, commentId)
                }
            ]
        );
    };

    return (
        <View style={postStyles.card}>
            <View style={postStyles.header}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={postStyles.userText}>{user}</Text>
                    <Text style={[postStyles.roleText, { color: roleColor }]}>({role.toUpperCase()})</Text>
                </View>
                {canDeletePost && (
                    <Pressable 
                        onPress={handleDeletePost}
                        style={postStyles.deleteButton}
                    >
                        <X size={18} color="#EF4444" />
                    </Pressable>
                )}
            </View>
            <Text style={postStyles.bodyText}>{text}</Text>

            {comments.length > 0 && (
                <View style={postStyles.commentsContainer}>
                    <Text style={postStyles.commentsTitle}>Comentarios ({comments.length})</Text>
                    {comments.map(comment => {
                        const canDeleteComment = currentUser.id === comment.authorId || currentUserRole === 'administrador';
                        return (
                            <View key={comment.id} style={postStyles.commentItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={postStyles.commentUserText}>{comment.user}:</Text>
                                    <Text style={postStyles.commentBodyText}>{comment.text}</Text>
                                </View>
                                {canDeleteComment && (
                                    <Pressable
                                        onPress={() => handleDeleteComment(comment.id)}
                                        style={postStyles.deleteCommentButton}
                                    >
                                        <X size={14} color="#EF4444" />
                                    </Pressable>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            <View style={postStyles.actionsContainer}>
                <Pressable
                    style={postStyles.actionButton}
                    onPress={handlePublicComment}
                >
                    <MessageSquare size={18} color={ACCENT_COLOR} />
                    <Text style={postStyles.actionButtonText}>
                        {showCommentInput ? 'Cerrar Comentario' : 'Comentar'}
                    </Text>
                </Pressable>

                {!isSelfPost && (
                    <Pressable
                        style={postStyles.actionButtonPrivate}
                        onPress={() => onPrivateMessage(authorId)}
                    >
                        <Send size={18} color="#10B981" />
                        <Text style={postStyles.actionButtonTextPrivate}>Mensaje Privado</Text>
                    </Pressable>
                )}
            </View>

            {showCommentInput && (
                <CommentInput
                    postId={id}
                    onCommentSubmit={handleCommentSubmit}
                    currentUser={currentUser.name}
                />
            )}
        </View>
    );
};


// --- Componente Principal (HomeScreen) ---
export default function HomeScreen() {
    const router = useRouter();
    
    const { user: authUser, logout } = useAuth();
    const { user: profileUser } = useUser();
    
    const [menuVisible, setMenuVisible] = useState(false);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [newPostText, setNewPostText] = useState('');

    const [publications, setPublications] = useState<Publication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Código de depuración
    useEffect(() => {
        console.log("--- DEBUGGING HomeScreen ---");
        console.log("Datos de useAuth() (authUser):", JSON.stringify(authUser, null, 2));
        console.log("Datos de useUser() (profileUser):", JSON.stringify(profileUser, null, 2));
        console.log("------------------------------");
    }, [authUser, profileUser]);

    
    if (!authUser || !profileUser) {
         return (
             <View style={[styles.fullScreen, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                 <ActivityIndicator size="large" color="#EF4444" />
                 <Text style={{ color: '#EF4444', marginTop: 15, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 }}>
                     Error: No se pudieron cargar los datos de usuario.
                 </Text>
             </View>
         );
    }

    const userName = profileUser.name;
    const userType = profileUser.type;
    const userId = authUser.id;

    // --- Funciones de Persistencia (AsyncStorage) ---
    const savePublications = async (data: Publication[]) => {
        try {
            const jsonValue = JSON.stringify(data);
            await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
        } catch (e) {
            console.error("Error al guardar las publicaciones:", e);
        }
    };

    const loadPublications = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            if (jsonValue !== null) {
                const loadedPubs = JSON.parse(jsonValue) as Publication[];
                
                if (loadedPubs.length > 0 && !loadedPubs[0].authorId) {
                    console.log("Detectadas publicaciones antiguas, limpiando almacenamiento...");
                    await AsyncStorage.removeItem(STORAGE_KEY);
                    setPublications(initialPublications); 
                    await savePublications(initialPublications);
                } else {
                    setPublications(loadedPubs);
                }

            } else {
                setPublications(initialPublications);
                await savePublications(initialPublications);
            }
        } catch (e) {
            console.error("Error al cargar las publicaciones:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPublications();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            savePublications(publications);
        }
    }, [publications, isLoading]);


    // --- Lógica de Publicaciones y Comentarios ---
    const handleNewPost = () => {
        if (!newPostText.trim()) {
            Alert.alert('Error', 'El texto de la publicación no puede estar vacío.');
            return;
        }

        const newPost: Publication = {
            id: Date.now(),
            user: userName,
            authorId: userId,
            text: newPostText.trim(),
            role: userType,
            comments: [],
        };
        setPublications(prev => [newPost, ...prev]);
        setNewPostText('');
        setPostModalVisible(false);
    };

    const handlePublicComment = (postId: number, commentText: string) => {
        const newComment: Comment = {
            id: Date.now(),
            user: userName,
            authorId: userId,
            text: commentText,
        };
        setPublications(prevPublications =>
            prevPublications.map(pub =>
                pub.id === postId
                    ? { ...pub, comments: [...pub.comments, newComment] }
                    : pub
            )
        );
    };

    const handlePrivateMessage = (authorId: string) => {
        if (!authorId) {
            Alert.alert('Error', 'No se pudo encontrar el ID del autor.');
            return;
        }
        router.push(`/chat/${authorId}`);
    };

    const handleDeletePost = (postId: number) => {
        setPublications(prevPublications =>
            prevPublications.filter(pub => pub.id !== postId)
        );
    };

    const handleDeleteComment = (postId: number, commentId: number) => {
        setPublications(prevPublications =>
            prevPublications.map(pub =>
                pub.id === postId
                    ? { ...pub, comments: pub.comments.filter(comment => comment.id !== commentId) }
                    : pub
            )
        );
    };

    const handleLogout = async () => {
        setMenuVisible(false);
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro de que quieres cerrar tu sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo cerrar la sesión');
                        }
                    },
                },
            ]
        );
    };

    // --- Funciones de Navegación ---
    const handleAdminAccess = () => {
        setMenuVisible(false);
        router.push('/admin');
    };

    const handleMapAccess = () => {
        setMenuVisible(false);
        router.push('/map');
    };

    const handleCreateTripAccess = () => {
        setMenuVisible(false);
        router.push('/crear-viaje');
    };

    const handleReservationsAccess = () => {
        setMenuVisible(false);
        router.push('/reservations');
    };

    const handleMessagesAccess = () => {
        setMenuVisible(false);
        router.push('/(tabs)/messages');
    };

    const handleMyTripsAccess = () => {
        setMenuVisible(false);
        router.push('/mis-viajes');
    };

    const handleLocationTrackingAccess = () => {
        setMenuVisible(false);
        router.push('/location-tracking');
    };

    const getMenuOptions = (type: string | null | undefined) => {
        const baseOptions = {
            administrador: [
                { name: 'Panel Admin', icon: Settings, action: handleAdminAccess },
                { name: 'Crear Viaje', icon: BusFront, action: handleCreateTripAccess },
                { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
                { name: 'Mensajes', icon: MessageSquare, action: handleMessagesAccess },
            ],
            conductor: [
                { name: 'Mis Rutas Asignadas', icon: BusFront, action: handleMyTripsAccess },
                { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
                { name: 'Mensajes', icon: MessageSquare, action: handleMessagesAccess },
            ],
            pasajero: [
                { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
                { name: 'Mis Reservas', icon: Ticket, action: handleReservationsAccess },
                { name: 'Mensajes', icon: MessageSquare, action: handleMessagesAccess },
            ]
        };

        const userOptions = type === 'administrador'
            ? baseOptions.administrador
            : type === 'conductor'
                ? baseOptions.conductor
                : baseOptions.pasajero;

        return [
            ...userOptions,
            { name: 'Cerrar Sesión', icon: LogOut, action: handleLogout, isDanger: true }
        ];
    };

    const menuOptions = getMenuOptions(userType);
    const capitalizedRole = typeof userType === 'string'
        ? userType.charAt(0).toUpperCase() + userType.slice(1)
        : 'Pasajero';

    if (isLoading) {
        return (
            <View style={[styles.fullScreen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={{ color: PRIMARY_COLOR, marginTop: 15, fontSize: 16 }}>
                    Cargando publicaciones...
                </Text>
            </View>
        );
    }

    // --- Renderizado del HomeScreen ---
    return (
        <View style={styles.fullScreen}>
            {/* Encabezado */}
            <View style={styles.header}>
                <Pressable
                    style={styles.profileButton}
                    onPress={() => router.push('/(tabs)/profile')}
                >
                    <User size={28} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Transporte UTEsc</Text>
                <Pressable
                    style={styles.menuButton}
                    onPress={() => setMenuVisible(true)}
                >
                    <Menu size={28} color="white" />
                </Pressable>
            </View>

            {/* Contenido Principal */}
            <ScrollView style={styles.contentArea}>
                <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>
                        Bienvenido, <Text style={styles.userNameText}>{userName}</Text>
                    </Text>
                    <Text style={styles.roleLabel}>{capitalizedRole}</Text>
                </View>

                <Pressable
                    style={styles.createPostButton}
                    onPress={() => setPostModalVisible(true)}
                >
                    <Plus size={20} color="white" />
                    <Text style={styles.createPostButtonText}>Crear Publicación</Text>
                </Pressable>

                <Text style={styles.feedTitle}>Publicaciones Recientes</Text>

                {publications.map((post) => (
                    <Post
                        key={post.id}
                        publication={post}
                        onPublicComment={handlePublicComment}
                        onPrivateMessage={handlePrivateMessage}
                        onDeletePost={handleDeletePost}
                        onDeleteComment={handleDeleteComment}
                        currentUser={{ name: userName, id: userId }}
                        currentUserRole={userType}
                    />
                ))}
                <View style={{ height: 50 }} />
            </ScrollView>

            {/* Modal del Menú Hamburguesa */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={menuVisible}
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuHeaderTitle}>Menú</Text>
                            <Pressable onPress={() => setMenuVisible(false)}>
                                <X size={24} color={PRIMARY_COLOR} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.menuContent}>
                            <View style={styles.userInfoSection}>
                                <View style={styles.userIconCircle}>
                                    <User size={35} color="white" />
                                </View>
                                <Text style={styles.menuUserName}>{userName}</Text>
                                <Text style={styles.menuUserType}>{capitalizedRole}</Text>
                            </View>

                            <View style={styles.menuDivider} />

                            {menuOptions.map((option, index) => (
                                <Pressable
                                    key={index}
                                    style={({ pressed }) => [
                                        styles.menuItem,
                                        pressed && styles.menuItemPressed,
                                        option.isDanger && styles.menuItemDanger,
                                    ]}
                                    onPress={option.action}
                                >
                                    <option.icon
                                        size={22}
                                        color={option.isDanger ? '#EF4444' : PRIMARY_COLOR}
                                    />
                                    <Text
                                        style={[
                                            styles.menuItemText,
                                            option.isDanger && styles.menuItemTextDanger,
                                        ]}
                                    >
                                        {option.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Modal para Crear Publicación */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={postModalVisible}
                onRequestClose={() => setPostModalVisible(false)}
            >
                <Pressable
                    style={styles.postModalOverlay}
                    onPress={() => setPostModalVisible(false)}
                >
                    <Pressable style={styles.postModalContainer} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.postModalHeader}>
                            <Text style={styles.postModalTitle}>Nueva Publicación</Text>
                            <Pressable onPress={() => setPostModalVisible(false)}>
                                <X size={24} color={PRIMARY_COLOR} />
                            </Pressable>
                        </View>

                        <TextInput
                            style={styles.postModalInput}
                            placeholder="¿Qué quieres compartir?"
                            value={newPostText}
                            onChangeText={setNewPostText}
                            multiline
                            textAlignVertical="top"
                        />

                        <Pressable
                            style={[
                                styles.postModalButton,
                                !newPostText.trim() && styles.postModalButtonDisabled,
                            ]}
                            onPress={handleNewPost}
                            disabled={!newPostText.trim()}
                        >
                            <Send size={20} color="white" />
                            <Text style={styles.postModalButtonText}>Publicar</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}


// Estilos
const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: PRIMARY_COLOR,
        paddingTop: 50,
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
    },
    profileButton: {
        padding: 5,
    },
    menuButton: {
        padding: 5,
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: 15,
    },
    welcomeContainer: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 15,
    },
    welcomeText: {
        fontSize: 22,
        color: '#1F2937',
        fontWeight: '300',
    },
    userNameText: {
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    roleLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 5,
    },
    createPostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT_COLOR,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        elevation: 3,
    },
    createPostButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    feedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    postModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    postModalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    postModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    postModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    postModalInput: {
        minHeight: 100,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        textAlignVertical: 'top',
        fontSize: 16,
    },
    postModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT_COLOR,
        padding: 12,
        borderRadius: 8,
    },
    postModalButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    postModalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    menuHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    menuContent: {
        padding: 20,
    },
    userInfoSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    userIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: ACCENT_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    menuUserName: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginTop: 5,
    },
    menuUserType: {
        fontSize: 14,
        color: '#6B7280',
        textTransform: 'capitalize',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 5,
    },
    menuItemPressed: {
        backgroundColor: '#F3F4F6',
    },
    menuItemDanger: {
        backgroundColor: '#FEF2F2',
    },
    menuItemText: {
        marginLeft: 15,
        fontSize: 16,
        fontWeight: '600',
        color: PRIMARY_COLOR,
    },
    menuItemTextDanger: {
        color: '#EF4444',
    },
});

// *** Estilos del Post ***
const postStyles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userText: {
        fontWeight: '700',
        fontSize: 16,
        marginRight: 8,
        color: '#1F2937',
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bodyText: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 10,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    actionButtonPrivate: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    actionButtonText: {
        marginLeft: 5,
        color: ACCENT_COLOR,
        fontWeight: '600',
        fontSize: 13,
    },
    actionButtonTextPrivate: {
        marginLeft: 5,
        color: '#10B981',
        fontWeight: '600',
        fontSize: 13,
    },
    commentsContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    commentsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 5,
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: 3,
        paddingLeft: 5,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    commentUserText: {
        fontWeight: '700',
        fontSize: 13,
        color: PRIMARY_COLOR,
        marginRight: 5,
    },
    commentBodyText: {
        fontSize: 13,
        color: '#4B5563',
        flexShrink: 1,
    },
    deleteButton: {
        padding: 5,
    },
    deleteCommentButton: {
        padding: 3,
        marginLeft: 8,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingBottom: 5,
    },
    commentTextInput: {
        flex: 1,
        minHeight: 35,
        maxHeight: 100,
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 8,
        paddingBottom: 8,
        fontSize: 14,
        borderColor: '#E5E7EB',
        borderWidth: 1,
        marginRight: 10,
    },
    commentSendButton: {
        padding: 5,
    },
});