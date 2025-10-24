import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, Lock, Globe, Moon, HelpCircle, Shield, Trash2, LogOut, Mail, Save } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { supabase } from '../context/supabase_client';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

export default function SettingsScreen() {
    const { onLogout } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    // Estados para configuraciones
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [locationSharing, setLocationSharing] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    // Estados para cambio de contraseña
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Alert.alert('Éxito', 'Contraseña actualizada correctamente');
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo cambiar la contraseña');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Eliminar Cuenta',
            '¿Estás seguro? Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // TODO: Implementar eliminación de cuenta
                            // Aquí deberías eliminar el usuario de la BD y de Auth
                            Alert.alert('Información', 'Función en desarrollo');
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar la cuenta');
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro de que quieres cerrar tu sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí',
                    onPress: () => {
                        if (onLogout && typeof onLogout === 'function') {
                            onLogout();
                        }
                    },
                },
            ]
        );
    };

    const SettingSection = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    const SettingItem = ({ 
        icon: Icon, 
        title, 
        subtitle, 
        onPress, 
        showSwitch, 
        switchValue, 
        onSwitchChange,
        isDanger = false 
    }: any) => (
        <Pressable 
            style={({ pressed }) => [
                styles.settingItem,
                pressed && styles.settingItemPressed,
                isDanger && styles.settingItemDanger
            ]}
            onPress={onPress}
        >
            <View style={styles.settingLeft}>
                <Icon size={22} color={isDanger ? '#EF4444' : PRIMARY_COLOR} />
                <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, isDanger && styles.settingTitleDanger]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={styles.settingSubtitle}>{subtitle}</Text>
                    )}
                </View>
            </View>
            {showSwitch && (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#D1D5DB', true: ACCENT_COLOR }}
                    thumbColor="white"
                />
            )}
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Configuración',
                headerStyle: { backgroundColor: PRIMARY_COLOR },
                headerTintColor: 'white',
            }} />

            <ScrollView style={styles.scrollView}>
                {/* Preferencias */}
                <SettingSection title="Preferencias" />
                
                <SettingItem
                    icon={Bell}
                    title="Notificaciones Push"
                    subtitle="Recibe alertas sobre tus reservas"
                    showSwitch={true}
                    switchValue={notifications}
                    onSwitchChange={setNotifications}
                />

                <SettingItem
                    icon={Mail}
                    title="Notificaciones por Email"
                    subtitle="Recibe actualizaciones en tu correo"
                    showSwitch={true}
                    switchValue={emailNotifications}
                    onSwitchChange={setEmailNotifications}
                />

                <SettingItem
                    icon={Moon}
                    title="Modo Oscuro"
                    subtitle="Próximamente disponible"
                    showSwitch={true}
                    switchValue={darkMode}
                    onSwitchChange={setDarkMode}
                />

                <SettingItem
                    icon={Globe}
                    title="Compartir Ubicación"
                    subtitle="Permite que el conductor vea tu ubicación"
                    showSwitch={true}
                    switchValue={locationSharing}
                    onSwitchChange={setLocationSharing}
                />

                {/* Seguridad */}
                <SettingSection title="Seguridad y Privacidad" />

                <SettingItem
                    icon={Lock}
                    title="Cambiar Contraseña"
                    subtitle="Actualiza tu contraseña de acceso"
                    onPress={() => setShowChangePassword(!showChangePassword)}
                />

                {showChangePassword && (
                    <View style={styles.passwordChangeContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña actual"
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Nueva contraseña"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirmar nueva contraseña"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <Pressable 
                            style={styles.savePasswordButton}
                            onPress={handleChangePassword}
                        >
                            <Save size={18} color="white" />
                            <Text style={styles.savePasswordText}>Guardar Contraseña</Text>
                        </Pressable>
                    </View>
                )}

                <SettingItem
                    icon={Shield}
                    title="Privacidad"
                    subtitle="Gestiona tus datos personales"
                    onPress={() => Alert.alert('Privacidad', 'Tus datos están protegidos según nuestra política de privacidad')}
                />

                {/* Soporte */}
                <SettingSection title="Soporte" />

                <SettingItem
                    icon={HelpCircle}
                    title="Centro de Ayuda"
                    subtitle="Preguntas frecuentes y soporte"
                    onPress={() => Alert.alert('Ayuda', 'Próximamente disponible')}
                />

                <SettingItem
                    icon={Mail}
                    title="Contactar Soporte"
                    subtitle="support@transporteutesc.com"
                    onPress={() => Alert.alert('Soporte', 'Envía un email a support@transporteutesc.com')}
                />

                {/* Cuenta */}
                <SettingSection title="Cuenta" />

                <SettingItem
                    icon={LogOut}
                    title="Cerrar Sesión"
                    onPress={handleLogout}
                />

                <SettingItem
                    icon={Trash2}
                    title="Eliminar Cuenta"
                    subtitle="Elimina permanentemente tu cuenta"
                    onPress={handleDeleteAccount}
                    isDanger={true}
                />

                {/* Información */}
                <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>Transporte UTEsc v1.0.0</Text>
                    <Text style={styles.infoSubtext}>
                        © 2025 Universidad Tecnológica de la Selva
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollView: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 20,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    settingItemPressed: {
        backgroundColor: '#F9FAFB',
    },
    settingItemDanger: {
        backgroundColor: '#FEF2F2',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 15,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: PRIMARY_COLOR,
    },
    settingTitleDanger: {
        color: '#EF4444',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    passwordChangeContainer: {
        backgroundColor: 'white',
        padding: 20,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
    },
    savePasswordButton: {
        flexDirection: 'row',
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    savePasswordText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    infoContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    infoText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    infoSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
        textAlign: 'center',
    },
});