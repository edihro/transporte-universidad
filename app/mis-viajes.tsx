import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../context/supabase_client';
// Agregamos Trash2 a los imports
import { ArrowLeft, Bus, Calendar, Clock, MapPin, Users, AlertCircle, X, Eye, Trash2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';
const BOOKED_COLOR = '#EF4444';
const AVAILABLE_COLOR = '#10B981';

interface Viaje {
    id: string;
    ruta_nombre: string;
    origen: string;
    destino: string;
    fecha: string;
    hora_salida: string;
    asientos_disponibles: number;
    asientos_totales: number;
    placa_vehiculo: string;
    estado: string;
}

export default function MisViajesScreen() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const { user: profileUser } = useUser();
    const [viajes, setViajes] = useState<Viaje[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // --- NUEVO: Estados para manejar los asientos reales ---
    const [showSeatsModal, setShowSeatsModal] = useState(false);
    const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);
    const [reservedSeats, setReservedSeats] = useState<string[]>([]);
    const [isLoadingSeats, setIsLoadingSeats] = useState(false);

    // Verificación de permisos
    useEffect(() => {
        if (profileUser && profileUser.type !== 'conductor') {
            Alert.alert(
                'Acceso Denegado',
                'Solo los conductores pueden ver esta sección.',
                [
                    {
                        text: 'Entendido',
                        onPress: () => router.back()
                    }
                ]
            );
        }
    }, [profileUser]);

    // Si no es conductor, mostrar pantalla de acceso denegado
    if (!profileUser || profileUser.type !== 'conductor') {
        return (
            <View style={styles.fullContainer}>
                <View style={styles.header}>
                    <Pressable 
                        onPress={() => router.back()} 
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="white" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Mis Rutas</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <AlertCircle size={64} color="#EF4444" />
                    <Text style={styles.deniedTitle}>Acceso Denegado</Text>
                    <Text style={styles.deniedText}>
                        Solo los conductores pueden ver las rutas asignadas.
                    </Text>
                    <Pressable 
                        style={styles.deniedButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.deniedButtonText}>Regresar</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    useEffect(() => {
        if (authUser) {
            fetchViajes();
        }
    }, [authUser]);

    const fetchViajes = async () => {
        if (!authUser?.id) return;
        
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('viajes')
                .select('*')
                .eq('conductor_id', authUser.id)
                .neq('estado', 'cancelado')
                // CAMBIO: Orden descendente para ver las más recientes ("últimas") y límite de 2
                .order('fecha', { ascending: false }) 
                .order('hora_salida', { ascending: false })
                .limit(2);

            if (error) throw error;
            setViajes(data || []);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudieron cargar los viajes: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- NUEVO: Función para obtener asientos reales de la BD ---
    const fetchReservedSeats = async (viajeId: string) => {
        setIsLoadingSeats(true);
        try {
            const { data, error } = await supabase
                .from('reservas')
                .select('asiento_numero')
                .eq('viaje_id', viajeId)
                .eq('estado', 'confirmada');

            if (error) throw error;
            
            // Extraemos solo el número de asiento en un array de strings
            const seats = data?.map(r => r.asiento_numero).filter(Boolean) || [];
            setReservedSeats(seats);
        } catch (error: any) {
            console.error('Error al cargar asientos:', error);
            Alert.alert('Error', 'No se pudieron cargar los detalles de los asientos');
        } finally {
            setIsLoadingSeats(false);
        }
    };

    // --- NUEVO: Función para Cancelar Viaje ---
    const handleCancelViaje = (viajeId: string) => {
        Alert.alert(
            'Cancelar Ruta',
            '¿Estás seguro de que deseas cancelar este viaje? Se eliminará de tu lista y no estará disponible para reservas.',
            [
                {
                    text: 'No, mantener',
                    style: 'cancel',
                },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('viajes')
                                .update({ estado: 'cancelado' })
                                .eq('id', viajeId);

                            if (error) throw error;

                            Alert.alert('Éxito', 'El viaje ha sido cancelado y eliminado de la lista.');
                            
                            // CAMBIO: Actualización optimista para borrarlo visualmente de inmediato
                            setViajes(currentViajes => currentViajes.filter(v => v.id !== viajeId));
                            
                            // Recargar la lista en segundo plano para asegurar consistencia
                            fetchViajes(); 
                        } catch (error: any) {
                            Alert.alert('Error', 'No se pudo cancelar el viaje: ' + error.message);
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchViajes();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'programado':
                return '#3B82F6';
            case 'en_curso':
                return '#10B981';
            case 'completado':
                return '#6B7280';
            case 'cancelado':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getEstadoLabel = (estado: string) => {
        switch (estado) {
            case 'programado':
                return 'Programado';
            case 'en_curso':
                return 'En Curso';
            case 'completado':
                return 'Completado';
            case 'cancelado':
                return 'Cancelado';
            default:
                return estado;
        }
    };

    // --- MODIFICADO: Ahora carga los asientos al abrir el modal ---
    const handleViewSeats = (viaje: Viaje) => {
        setSelectedViaje(viaje);
        setShowSeatsModal(true);
        // Llamamos a la BD para este viaje específico
        fetchReservedSeats(viaje.id);
    };

    const renderSeatMap = () => {
        if (!selectedViaje) return null;

        // Si está cargando, mostramos spinner dentro del mapa
        if (isLoadingSeats) {
            return (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={{ marginTop: 10, color: '#6B7280' }}>Cargando ocupación...</Text>
                </View>
            );
        }

        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const seatsPerRow = 4;
        
        const seatMap: { id: string, status: 'available' | 'booked' }[] = [];
        
        rows.forEach((row) => {
            for (let i = 1; i <= seatsPerRow; i++) {
                const id = `${row}${i}`;
                // --- LÓGICA REAL: Compara con el array de la BD ---
                const status = reservedSeats.includes(id) ? 'booked' : 'available';
                seatMap.push({ id, status });
            }
        });

        const renderSeat = (seat: { id: string, status: 'available' | 'booked' }) => {
            const color = seat.status === 'booked' ? BOOKED_COLOR : AVAILABLE_COLOR;
            
            return (
                <View
                    key={seat.id}
                    style={[
                        seatsModalStyles.seat,
                        { borderColor: color }
                    ]}
                >
                    {/* Emoji de asiento de transporte 💺 */}
                    <Text style={seatsModalStyles.seatEmoji}>💺</Text>
                    <Text style={[seatsModalStyles.seatText, { color: color }]}>{seat.id}</Text>
                </View>
            );
        };

        return (
            <ScrollView contentContainerStyle={seatsModalStyles.mapContainer}>
                {rows.map((rowLetter) => (
                    <View key={rowLetter} style={seatsModalStyles.row}>
                        <View style={seatsModalStyles.seatGroup}>
                            {seatMap
                                .filter(seat => seat.id.startsWith(rowLetter) && (seat.id.endsWith('1') || seat.id.endsWith('2')))
                                .map(renderSeat)}
                        </View>
                        <View style={seatsModalStyles.aisle} />
                        <View style={seatsModalStyles.seatGroup}>
                            {seatMap
                                .filter(seat => seat.id.startsWith(rowLetter) && (seat.id.endsWith('3') || seat.id.endsWith('4')))
                                .map(renderSeat)}
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.fullContainer}>
                <View style={styles.header}>
                    <Pressable 
                        onPress={() => router.back()} 
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="white" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Mis Rutas</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Cargando rutas asignadas...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.fullContainer}>
            <View style={styles.header}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Mis Rutas</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView 
                style={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[PRIMARY_COLOR]}
                    />
                }
            >
                <View style={styles.container}>
                    <View style={styles.infoCard}>
                        <Bus size={24} color={PRIMARY_COLOR} />
                        <Text style={styles.infoText}>
                            Aqui puedes ver las últimas 2 rutas asignadas
                        </Text>
                    </View>

                    {viajes.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Bus size={64} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No hay rutas recientes</Text>
                            <Text style={styles.emptyText}>
                                No se encontraron rutas recientes asignadas a tu cuenta.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>
                                Últimas Rutas Asignadas ({viajes.length})
                            </Text>

                            {viajes.map((viaje) => (
                                <View key={viaje.id} style={styles.viajeCard}>
                                    <View style={styles.viajeHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rutaNombre}>{viaje.ruta_nombre}</Text>
                                            <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(viaje.estado) }]}>
                                                <Text style={styles.estadoText}>
                                                    {getEstadoLabel(viaje.estado)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Bus size={28} color={PRIMARY_COLOR} />
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.infoRow}>
                                        <MapPin size={18} color="#6B7280" />
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.labelText}>Ruta:</Text>
                                            <Text style={styles.valueText}>
                                                {viaje.origen} → {viaje.destino}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Calendar size={18} color="#6B7280" />
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.labelText}>Fecha:</Text>
                                            <Text style={styles.valueText}>
                                                {formatDate(viaje.fecha)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Clock size={18} color="#6B7280" />
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.labelText}>Hora de salida:</Text>
                                            <Text style={styles.valueText}>{viaje.hora_salida}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Users size={18} color="#6B7280" />
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.labelText}>Asientos:</Text>
                                            <Text style={styles.valueText}>
                                                {viaje.asientos_disponibles} disponibles / {viaje.asientos_totales} totales
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Bus size={18} color="#6B7280" />
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.labelText}>Vehículo:</Text>
                                            <Text style={styles.valueText}>{viaje.placa_vehiculo}</Text>
                                        </View>
                                    </View>

                                    {/* --- BOTONES DE ACCIÓN --- */}
                                    <View style={styles.actionButtonsContainer}>
                                        <Pressable
                                            style={[styles.actionButton, styles.viewSeatsButton]}
                                            onPress={() => handleViewSeats(viaje)}
                                        >
                                            <Eye size={18} color="white" />
                                            <Text style={styles.actionButtonText}>Ver Asientos</Text>
                                        </Pressable>

                                        
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    <View style={{ height: 30 }} />
                </View>
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showSeatsModal}
                onRequestClose={() => setShowSeatsModal(false)}
            >
                <View style={seatsModalStyles.modalOverlay}>
                    <View style={seatsModalStyles.modalContainer}>
                        <View style={seatsModalStyles.modalHeader}>
                            <Text style={seatsModalStyles.modalTitle}>
                                Mapa de Asientos
                            </Text>
                            <Pressable onPress={() => setShowSeatsModal(false)}>
                                <X size={24} color={PRIMARY_COLOR} />
                            </Pressable>
                        </View>

                        {selectedViaje && (
                            <>
                                <View style={seatsModalStyles.tripInfo}>
                                    <Text style={seatsModalStyles.tripRoute}>
                                        {selectedViaje.ruta_nombre}
                                    </Text>
                                    <Text style={seatsModalStyles.tripDetail}>
                                        {selectedViaje.origen} → {selectedViaje.destino}
                                    </Text>
                                </View>

                                <View style={seatsModalStyles.legendContainer}>
                                    <View style={seatsModalStyles.legendItem}>
                                        <Text style={seatsModalStyles.seatEmoji}>💺</Text>
                                        <Text style={seatsModalStyles.legendText}>Disponible</Text>
                                    </View>
                                    <View style={seatsModalStyles.legendItem}>
                                        <Text style={seatsModalStyles.seatEmoji}>💺</Text>
                                        <Text style={seatsModalStyles.legendText}>Ocupado</Text>
                                    </View>
                                </View>

                                {renderSeatMap()}
                            </>
                        )}

                        <Pressable
                            style={seatsModalStyles.closeButton}
                            onPress={() => setShowSeatsModal(false)}
                        >
                            <Text style={seatsModalStyles.closeButtonText}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    fullContainer: {
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
    backButton: {
        padding: 5,
    },
    headerPlaceholder: {
        width: 34,
    },
    scrollContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 15,
    },
    loadingText: {
        marginTop: 10,
        color: PRIMARY_COLOR,
        fontSize: 16,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        gap: 12,
    },
    infoText: {
        flex: 1,
        color: PRIMARY_COLOR,
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 15,
    },
    viajeCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    viajeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    rutaNombre: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 8,
    },
    estadoBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    estadoText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
    },
    routeInfo: {
        flex: 1,
    },
    labelText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    valueText: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
    },
    deniedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#EF4444',
        marginTop: 20,
        marginBottom: 10,
    },
    deniedText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 30,
    },
    deniedButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    deniedButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    // Nuevos estilos para los botones
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 6,
    },
    viewSeatsButton: {
        backgroundColor: ACCENT_COLOR,
    },
    cancelButton: {
        backgroundColor: BOOKED_COLOR,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

const seatsModalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '100%',
        maxHeight: '90%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    tripInfo: {
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    tripRoute: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 4,
    },
    tripDetail: {
        fontSize: 14,
        color: '#6B7280',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },
    mapContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 230,
        marginBottom: 8,
    },
    seatGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    aisle: {
        width: 25,
    },
    seat: {
        width: 45,
        height: 45,
        borderWidth: 2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        backgroundColor: '#F9FAFB',
    },
    seatEmoji: {
        fontSize: 16,
    },
    seatText: {
        fontSize: 9,
        fontWeight: 'bold',
        marginTop: 2,
    },
    closeButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});