import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Switch } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation, AlertCircle } from 'lucide-react-native';
import { supabase } from '../context/supabase_client';
import { useUser } from '../context/UserContext';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

export default function DriverLocationTracker() {
    const { user } = useUser();
    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const updateInterval = useRef<NodeJS.Timeout | null>(null);

    // Verificar permisos de ubicación
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setHasPermission(status === 'granted');
            
            if (status !== 'granted') {
                Alert.alert(
                    'Permisos de ubicación',
                    'Se necesitan permisos de ubicación para compartir tu posición en tiempo real.'
                );
            }
        })();
    }, []);

    // Actualizar ubicación en Supabase
    const updateLocationInDatabase = async (location: Location.LocationObject) => {
        if (!user?.uid || !user?.name) return;

        try {
            const { error } = await supabase
                .from('driver_locations')
                .upsert({
                    driver_id: user.uid,
                    driver_name: user.name,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                    heading: location.coords.heading,
                    speed: location.coords.speed,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'driver_id'
                });

            if (error) {
                console.error('Error al actualizar ubicación:', error);
            }
        } catch (error) {
            console.error('Error en updateLocationInDatabase:', error);
        }
    };

    // Marcar como inactivo en Supabase
    const markAsInactive = async () => {
        if (!user?.uid) return;

        try {
            await supabase
                .from('driver_locations')
                .update({ is_active: false })
                .eq('driver_id', user.uid);
        } catch (error) {
            console.error('Error al marcar como inactivo:', error);
        }
    };

    // Iniciar seguimiento
    const startTracking = async () => {
        if (!hasPermission) {
            Alert.alert('Error', 'No tienes permisos de ubicación activados.');
            return;
        }

        try {
            // Obtener ubicación inicial
            const initialLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setCurrentLocation(initialLocation);
            await updateLocationInDatabase(initialLocation);

            // Suscribirse a actualizaciones de ubicación
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Actualizar cada 5 segundos
                    distanceInterval: 10, // O cuando se mueva 10 metros
                },
                (newLocation) => {
                    setCurrentLocation(newLocation);
                    updateLocationInDatabase(newLocation);
                }
            );

            locationSubscription.current = subscription;
            setIsTracking(true);
        } catch (error) {
            console.error('Error al iniciar seguimiento:', error);
            Alert.alert('Error', 'No se pudo iniciar el seguimiento de ubicación.');
        }
    };

    // Detener seguimiento
    const stopTracking = async () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }

        if (updateInterval.current) {
            clearInterval(updateInterval.current);
            updateInterval.current = null;
        }

        await markAsInactive();
        setIsTracking(false);
        setCurrentLocation(null);
    };

    // Toggle de seguimiento
    const handleToggleTracking = async () => {
        if (isTracking) {
            await stopTracking();
        } else {
            await startTracking();
        }
    };

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, []);

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <AlertCircle size={48} color="#EF4444" />
                    <Text style={styles.errorTitle}>Permisos necesarios</Text>
                    <Text style={styles.errorText}>
                        Por favor, activa los permisos de ubicación en la configuración de tu dispositivo.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Navigation size={28} color={isTracking ? '#10B981' : '#6B7280'} />
                    <Text style={styles.title}>Compartir Ubicación en Vivo</Text>
                </View>

                <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Estado:</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isTracking ? '#D1FAE5' : '#FEE2E2' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isTracking ? '#10B981' : '#EF4444' }
                            ]}>
                                {isTracking ? 'Activo' : 'Inactivo'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>
                            {isTracking ? 'Desactivar' : 'Activar'} seguimiento
                        </Text>
                        <Switch
                            value={isTracking}
                            onValueChange={handleToggleTracking}
                            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                            thumbColor={isTracking ? ACCENT_COLOR : '#F3F4F6'}
                        />
                    </View>
                </View>

                {currentLocation && (
                    <View style={styles.locationInfo}>
                        <View style={styles.locationHeader}>
                            <MapPin size={20} color={PRIMARY_COLOR} />
                            <Text style={styles.locationTitle}>Ubicación Actual</Text>
                        </View>
                        
                        <View style={styles.coordsContainer}>
                            <View style={styles.coordRow}>
                                <Text style={styles.coordLabel}>Latitud:</Text>
                                <Text style={styles.coordValue}>
                                    {currentLocation.coords.latitude.toFixed(6)}
                                </Text>
                            </View>
                            <View style={styles.coordRow}>
                                <Text style={styles.coordLabel}>Longitud:</Text>
                                <Text style={styles.coordValue}>
                                    {currentLocation.coords.longitude.toFixed(6)}
                                </Text>
                            </View>
                            {currentLocation.coords.speed && (
                                <View style={styles.coordRow}>
                                    <Text style={styles.coordLabel}>Velocidad:</Text>
                                    <Text style={styles.coordValue}>
                                        {(currentLocation.coords.speed * 3.6).toFixed(1)} km/h
                                    </Text>
                                </View>
                            )}
                            {currentLocation.coords.accuracy && (
                                <View style={styles.coordRow}>
                                    <Text style={styles.coordLabel}>Precisión:</Text>
                                    <Text style={styles.coordValue}>
                                        ±{currentLocation.coords.accuracy.toFixed(0)} m
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {isTracking && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            Tu ubicación se está compartiendo en tiempo real con los pasajeros.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 15,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginLeft: 10,
    },
    statusContainer: {
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    statusLabel: {
        fontSize: 16,
        color: '#4B5563',
        marginRight: 10,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '700',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    switchLabel: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
    },
    locationInfo: {
        marginTop: 10,
        padding: 15,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginLeft: 8,
    },
    coordsContainer: {
        gap: 8,
    },
    coordRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coordLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    coordValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
    },
    infoBox: {
        marginTop: 15,
        padding: 12,
        backgroundColor: '#D1FAE5',
        borderRadius: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#065F46',
        textAlign: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        padding: 30,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#EF4444',
        marginTop: 15,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
});