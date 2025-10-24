import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Menu, User, BusFront, Pencil, LogOut, Settings, X, MessageSquare, Send, Map } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

const Post = ({ user, text, role, onPublicComment, onPrivateMessage }: { 
  user: string, 
  text: string, 
  role: string,
  onPublicComment: () => void,
  onPrivateMessage: () => void
}) => {
  let roleColor = '#4B5563';
  if (role === 'administrador') roleColor = '#EF4444';
  if (role === 'conductor') roleColor = PRIMARY_COLOR;

  return (
    <View style={postStyles.card}>
      <View style={postStyles.header}>
        <Text style={postStyles.userText}>{user}</Text>
        <Text style={[postStyles.roleText, { color: roleColor }]}>({role.toUpperCase()})</Text>
      </View>
      <Text style={postStyles.bodyText}>{text}</Text>
      
      {/* Botones de comentarios */}
      <View style={postStyles.actionsContainer}>
        <Pressable 
          style={postStyles.actionButton}
          onPress={onPublicComment}
        >
          <MessageSquare size={18} color={ACCENT_COLOR} />
          <Text style={postStyles.actionButtonText}>Comentar</Text>
        </Pressable>
        
        <Pressable 
          style={postStyles.actionButtonPrivate}
          onPress={onPrivateMessage}
        >
          <Send size={18} color="#10B981" />
          <Text style={postStyles.actionButtonTextPrivate}>Mensaje Privado</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { onLogout } = useAuth();
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);

  const userName = user?.name || 'Usuario';
  const userType = user?.type || 'pasajero';

  const publications = [
    { id: 1, user: 'Admin', text: 'El servicio de ruta 3 se retrasa 15 minutos. ¡Atentos!', role: 'administrador' },
    { id: 2, user: 'Chofer-Ruta1', text: 'Ruta 1 iniciando recorrido. Todo despejado.', role: 'conductor' },
    { id: 3, user: 'JuanPerez', text: '¿Alguien ha visto la ruta 2 cerca de la glorieta?', role: 'pasajero' },
    { id: 4, user: 'Chofer-Ruta2', text: 'Respuesta a JuanPerez: Estamos a 5 minutos de la glorieta.', role: 'conductor' },
  ];

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
              if (onLogout && typeof onLogout === 'function') {
                await onLogout();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const handleAdminAccess = () => {
    setMenuVisible(false);
    router.push('/admin');
  };

  const handleMapAccess = () => {
    setMenuVisible(false);
    router.push('/map');
  };

  const getMenuOptions = (type: string | null | undefined) => {
    const baseOptions = {
      administrador: [
        { name: 'Panel de Administrador', icon: Settings, action: handleAdminAccess },
        { name: 'Gestión de Rutas', icon: BusFront, action: () => { setMenuVisible(false); alert('Ir a Gestión de Rutas'); } },
        { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
      ],
      conductor: [
        { name: 'Reporte de Novedades', icon: Pencil, action: () => { setMenuVisible(false); alert('Ir a Reporte de Novedades'); } },
        { name: 'Mi Ruta', icon: BusFront, action: () => { setMenuVisible(false); alert('Ir a Mi Ruta'); } },
        { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
      ],
      pasajero: [
        { name: 'Ver Rutas', icon: BusFront, action: () => { setMenuVisible(false); alert('Ir a Ver Rutas'); } },
        { name: 'Ver Mapa', icon: Map, action: handleMapAccess },
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

  return (
    <View style={styles.fullScreen}>
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

      <ScrollView style={styles.contentArea}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bienvenido, <Text style={styles.userNameText}>{userName}</Text>
          </Text>
          <Text style={styles.roleLabel}>{capitalizedRole}</Text>
        </View>

        <Text style={styles.feedTitle}>Publicaciones Recientes</Text>

        {publications.map((post) => (
          <Post key={post.id} user={post.user} text={post.text} role={post.role} />
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

            <View style={styles.menuContent}>
              <View style={styles.userInfoSection}>
                <View style={styles.userIconCircle}>
                  <User size={32} color="white" />
                </View>
                <Text style={styles.menuUserName}>{userName}</Text>
                <Text style={styles.menuUserType}>{capitalizedRole}</Text>
              </View>

              <View style={styles.menuDivider} />

              {menuOptions.map((item, index) => (
                <Pressable 
                  key={index} 
                  style={({ pressed }) => [
                    styles.menuItem,
                    item.isDanger && styles.menuItemDanger,
                    pressed && styles.menuItemPressed
                  ]}
                  onPress={item.action}
                >
                  <item.icon 
                    size={22} 
                    color={item.isDanger ? '#EF4444' : PRIMARY_COLOR} 
                  />
                  <Text style={[
                    styles.menuItemText,
                    item.isDanger && styles.menuItemTextDanger
                  ]}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

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
  feedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  
  // Estilos del Modal del Menú
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
    marginTop: 3,
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
  },
});