import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Calendar, Clock, User, XCircle, CheckCircle } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../context/supabase_client';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

interface Reservation {
    id: string;
    ruta: string;
    origen: string;
    destino: string;
    fecha: string;
    hora: string;
    conductor: string;
    estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
    asientos: number;
}

export default function ReservationsScreen() {
    const { user } = useUser();
    const router = useRouter();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadReservations();
    }, []);

    const loadReservations = async () => {
        try {
            setIsLoading(true);
            
            if (!user?.uid) {
                setIsLoading(false);
                return;
            }

            // Cargar reservas reales desde Supabase usando los nombres correctos
            const { data, error } = await supabase
                .from('reservas')
                .select(`
                    id,
                    viaje_id,
                    pasajero_id,
                    cantidad_asientos,
                    estado,
                    precio_total,
                    fecha_reserva,
                    origen,
                    destino,
                    fecha,
                    hora,
                    conductor_id
                `)
                .eq('pasajero_id', user.uid)
                .order('fecha_reserva', { ascending: false });

            if (error) {
                console.error('Error al cargar reservas:', error);
                setReservations([]);
                return;
            }

            // Transformar datos al formato esperado
            const formattedReservations: Reservation[] = (data || []).map((item: any) => ({
                id: item.id,
                ruta: `Viaje #${item.viaje_id || 'N/A'}`,
                origen: item.origen || 'Sin origen',
                destino: item.destino || 'Sin destino',
                fecha: item.fecha || item.fecha_reserva?.split('T')[0] || '',
                hora: item.hora || '00:00',
                conductor: 'Conductor Asignado', // TODO: Hacer JOIN con tabla perfiles
                estado: item.estado || 'pendiente',
                asientos: item.cantidad_asientos || 1,
            }));

            setReservations(formattedReservations);
        } catch (error: any) {
            console.error('Error:', error);
            Alert.alert('Error', 'No se pudieron cargar las reservas');
            setReservations([]);
        } finally {
            setIsLoading(false);
        }
    };

    const cancelReservation = (id: string) => {
        Alert.alert(
            'Cancelar Reserva',
            '¿Estás seguro de que quieres cancelar esta reserva?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Actualizar estado en Supabase
                            const { error } = await supabase
                                .from('reservas')
                                .update({ estado: 'cancelada' })
                                .eq('id', id);

                            if (error) throw error;

                            // Actualizar estado local
                            setReservations(prev =>
                                prev.map(r => r.id === id ? { ...r, estado: 'cancelada' as const } : r)
                            );
                            Alert.alert('Éxito', 'Reserva cancelada correctamente');
                        } catch (error: any) {
                            console.error('Error al cancelar:', error);
                            Alert.alert('Error', 'No se pudo cancelar la reserva');
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return '#10B981';
            case 'pendiente': return '#F59E0B';
            case 'cancelada': return '#EF4444';
            case 'completada': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (estado: string) => {
        switch (estado) {
            case 'confirmada': return <CheckCircle size={20} color="#10B981" />;
            case 'pendiente': return <Clock size={20} color="#F59E0B" />;
            case 'cancelada': return <XCircle size={20} color="#EF4444" />;
            case 'completada': return <CheckCircle size={20} color="#6B7280" />;
            default: return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    headerShown: true,
                    title: 'Mis Reservas',
                    headerStyle: { backgroundColor: PRIMARY_COLOR },
                    headerTintColor: 'white',
                }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Cargando reservas...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Mis Reservas',
                headerStyle: { backgroundColor: PRIMARY_COLOR },
                headerTintColor: 'white',
            }} />

            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Tus Reservas</Text>
                    <Text style={styles.headerSubtitle}>
                        {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'}
                    </Text>
                </View>

                {reservations.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MapPin size={60} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No tienes reservas</Text>
                        <Text style={styles.emptySubtitle}>
                            Explora las rutas disponibles y haz tu primera reserva
                        </Text>
                        <Pressable 
                            style={styles.exploreButton}
                            onPress={() => router.push('/(tabs)/explore')}
                        >
                            <Text style={styles.exploreButtonText}>Ver Rutas</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.reservationsContainer}>
                        {reservations.map((reservation) => (
                            <View key={reservation.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.routeName}>{reservation.ruta}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.estado) + '20' }]}>
                                        {getStatusIcon(reservation.estado)}
                                        <Text style={[styles.statusText, { color: getStatusColor(reservation.estado) }]}>
                                            {reservation.estado.charAt(0).toUpperCase() + reservation.estado.slice(1)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.routeInfo}>
                                    <View style={styles.locationRow}>
                                        <MapPin size={16} color={PRIMARY_COLOR} />
                                        <Text style={styles.locationText}>{reservation.origen}</Text>
                                    </View>
                                    <View style={styles.arrowContainer}>
                                        <Text style={styles.arrow}>→</Text>
                                    </View>
                                    <View style={styles.locationRow}>
                                        <MapPin size={16} color={ACCENT_COLOR} />
                                        <Text style={styles.locationText}>{reservation.destino}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailsRow}>
                                    <View style={styles.detailItem}>
                                        <Calendar size={16} color="#6B7280" />
                                        <Text style={styles.detailText}>{formatDate(reservation.fecha)}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Clock size={16} color="#6B7280" />
                                        <Text style={styles.detailText}>{reservation.hora}</Text>
                                    </View>
                                </View>

                                <View style={styles.driverRow}>
                                    <User size={16} color="#6B7280" />
                                    <Text style={styles.driverText}>Conductor: {reservation.conductor}</Text>
                                </View>

                                <View style={styles.seatsRow}>
                                    <Text style={styles.seatsText}>
                                        {reservation.asientos} {reservation.asientos === 1 ? 'asiento' : 'asientos'} reservados
                                    </Text>
                                </View>

                                {reservation.estado === 'pendiente' || reservation.estado === 'confirmada' ? (
                                    <Pressable
                                        style={styles.cancelButton}
                                        onPress={() => cancelReservation(reservation.id)}
                                    >
                                        <XCircle size={18} color="white" />
                                        <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 30 }} />
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    exploreButton: {
        backgroundColor: ACCENT_COLOR,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    exploreButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    reservationsContainer: {
        padding: 15,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeName: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    locationText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    arrowContainer: {
        paddingHorizontal: 5,
    },
    arrow: {
        fontSize: 18,
        color: '#6B7280',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 13,
        color: '#6B7280',
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    driverText: {
        fontSize: 13,
        color: '#6B7280',
    },
    seatsRow: {
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    seatsText: {
        fontSize: 13,
        fontWeight: '600',
        color: PRIMARY_COLOR,
    },
    cancelButton: {
        flexDirection: 'row',
        backgroundColor: '#EF4444',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});