import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/supabase_client';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';
const BOOKED_COLOR = '#EF4444'; 
const AVAILABLE_COLOR = '#10B981';
const SELECTED_COLOR = '#3B82F6';

// --- Tipos de datos ---
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

// --- Sub-Componente: Paso 1 (Selección de Viaje) ---
const BusSelection = ({ 
    viajes, 
    onSelectBus, 
    isLoading 
}: { 
    viajes: Viaje[];
    onSelectBus: (viajeId: string) => void;
    isLoading: boolean;
}) => {
    if (isLoading) {
        return (
            <View style={[stepStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={{ marginTop: 10, color: PRIMARY_COLOR }}>Cargando viajes...</Text>
            </View>
        );
    }

    if (viajes.length === 0) {
        return (
            <View style={stepStyles.container}>
                <Text style={stepStyles.title}>1. Selecciona el Viaje</Text>
                <View style={stepStyles.emptyContainer}>
                    <Text style={stepStyles.emptyText}>🚌</Text>
                    <Text style={stepStyles.emptyTitle}>No hay viajes disponibles</Text>
                    <Text style={stepStyles.emptySubtext}>
                        Actualmente no hay viajes programados. Por favor, intenta más tarde.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={stepStyles.container}>
            <Text style={stepStyles.title}>1. Selecciona el Viaje</Text>
            <ScrollView contentContainerStyle={stepStyles.scrollContent}>
                {viajes.map(viaje => (
                    <Pressable
                        key={viaje.id}
                        style={stepStyles.busCard}
                        onPress={() => onSelectBus(viaje.id)}
                        disabled={viaje.asientos_disponibles === 0}
                    >
                        <View style={stepStyles.busIconPlaceholder}>
                            <Text style={stepStyles.busIconText}>🚌</Text>
                        </View>
                        
                        <View style={stepStyles.busInfo}>
                            <Text style={stepStyles.busRoute}>{viaje.ruta_nombre}</Text>
                            <View style={stepStyles.infoRow}>
                                <Text style={stepStyles.busDetail}>
                                    📍 {viaje.origen} → {viaje.destino}
                                </Text>
                            </View>
                            <View style={stepStyles.infoRow}>
                                <Text style={stepStyles.busDetail}>🕒 Salida: {viaje.hora_salida}</Text>
                            </View>
                            <View style={stepStyles.infoRow}>
                                <Text style={[
                                    stepStyles.busDetail, 
                                    { color: viaje.asientos_disponibles > 0 ? AVAILABLE_COLOR : BOOKED_COLOR }
                                ]}>
                                    💺 {viaje.asientos_disponibles} / {viaje.asientos_totales} asientos libres
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
};

// --- Sub-Componente: Paso 2 (Selección de Asiento) ---
const SeatSelection = ({ 
    viajeId, 
    onBack, 
    onConfirmReservation,
    userType
}: { 
    viajeId: string;
    onBack: () => void; 
    onConfirmReservation: (seatId: string) => void;
    userType: string;
}) => {
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [reservedSeats, setReservedSeats] = useState<string[]>([]);
    const [isLoadingSeats, setIsLoadingSeats] = useState(true);
    const isDriver = userType === 'conductor';

    // Cargar asientos reservados desde Supabase
    useEffect(() => {
        fetchReservedSeats();
    }, [viajeId]);

    const fetchReservedSeats = async () => {
        try {
            const { data, error } = await supabase
                .from('reservas')
                .select('asiento_numero')
                .eq('viaje_id', viajeId)
                .eq('estado', 'confirmada');

            if (error) throw error;
            
            const seats = data?.map(r => r.asiento_numero).filter(Boolean) || [];
            setReservedSeats(seats);
        } catch (error: any) {
            console.error('Error al cargar asientos:', error);
            Alert.alert('Error', 'No se pudieron cargar los asientos reservados');
            setReservedSeats([]);
        } finally {
            setIsLoadingSeats(false);
        }
    };

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 4;
    const seatMap: { id: string, status: 'available' | 'booked' }[] = [];

    rows.forEach((row) => {
        for (let i = 1; i <= seatsPerRow; i++) {
            const id = `${row}${i}`;
            const status = reservedSeats.includes(id) ? 'booked' : 'available';
            seatMap.push({ id, status });
        }
    });

    const getSeatColor = (id: string, status: 'available' | 'booked') => {
        if (id === selectedSeat) return SELECTED_COLOR;
        if (status === 'booked') return BOOKED_COLOR;
        return AVAILABLE_COLOR;
    };

    const handleSeatPress = (id: string, status: 'available' | 'booked') => {
        if (isDriver) {
            Alert.alert('Acción no permitida', 'Como conductor, solo puedes ver los asientos.');
            return;
        }
        if (status === 'booked') {
            Alert.alert('Asiento Ocupado', `El asiento ${id} ya ha sido reservado.`);
            return;
        }
        setSelectedSeat(prev => (prev === id ? null : id));
    };

    const handleReserve = () => {
        if (selectedSeat) {
            onConfirmReservation(selectedSeat);
        } else {
            Alert.alert('Atención', 'Por favor, selecciona un asiento para continuar.');
        }
    };

    const renderSeat = (seat: { id: string, status: 'available' | 'booked' }) => {
        const color = getSeatColor(seat.id, seat.status);
        const isSelected = seat.id === selectedSeat;
        const isBooked = seat.status === 'booked';

        return (
            <Pressable
                key={seat.id}
                onPress={() => handleSeatPress(seat.id, seat.status)}
                style={[
                    seatStyles.seat,
                    { borderColor: color },
                    isSelected && { backgroundColor: SELECTED_COLOR + '30' }
                ]}
                disabled={isBooked}
            >
                <Text style={seatStyles.seatEmoji}>💺</Text>
                <Text style={[seatStyles.seatText, { color: color }]}>{seat.id}</Text>
            </Pressable>
        );
    };

    if (isLoadingSeats) {
        return (
            <View style={[stepStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={{ marginTop: 10, color: PRIMARY_COLOR }}>Cargando asientos...</Text>
            </View>
        );
    }

    return (
        <View style={stepStyles.container}>
            <View style={stepStyles.stepHeader}>
                <Pressable onPress={onBack} style={stepStyles.backButton}>
                    <Text style={stepStyles.backButtonText}>&lt; Volver</Text>
                </Pressable>
                <Text style={stepStyles.title}>2. Elige tu Asiento</Text>
            </View>

            <View style={seatStyles.legendContainer}>
                <View style={seatStyles.legendItem}>
                    <Text style={seatStyles.seatEmoji}>💺</Text>
                    <Text style={seatStyles.legendText}>(Disponible)</Text>
                </View>
                <View style={seatStyles.legendItem}>
                    <Text style={seatStyles.seatEmoji}>💺</Text>
                    <Text style={seatStyles.legendText}>(Ocupado)</Text>
                </View>
                <View style={seatStyles.legendItem}>
                    <Text style={seatStyles.seatEmoji}>💺</Text>
                    <Text style={seatStyles.legendText}>(Seleccionado)</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={seatStyles.mapContainer}>
                {rows.map((rowLetter) => (
                    <View key={rowLetter} style={seatStyles.row}>
                        <View style={seatStyles.seatGroup}>
                            {seatMap
                                .filter(seat => seat.id.startsWith(rowLetter) && (seat.id.endsWith('1') || seat.id.endsWith('2')))
                                .map(renderSeat)}
                        </View>
                        <View style={seatStyles.aisle} />
                        <View style={seatStyles.seatGroup}>
                            {seatMap
                                .filter(seat => seat.id.startsWith(rowLetter) && (seat.id.endsWith('3') || seat.id.endsWith('4')))
                                .map(renderSeat)}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Pressable
                style={[
                    seatStyles.reserveButton, 
                    (!selectedSeat || isDriver) && seatStyles.reserveButtonDisabled
                ]}
                onPress={handleReserve}
                disabled={!selectedSeat || isDriver}
            >
                <Text style={seatStyles.reserveButtonText}>
                    {isDriver 
                        ? 'Conductores no pueden reservar' 
                        : `Reservar asiento: ${selectedSeat || '---'}`
                    }
                </Text>
            </Pressable>
        </View>
    );
};

// --- Componente Principal ---
export default function ReserveSpotScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { user: authUser } = useAuth();
    const userType = user?.type || 'pasajero';
    const [viajes, setViajes] = useState<Viaje[]>([]);
    const [selectedViajeId, setSelectedViajeId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReserving, setIsReserving] = useState(false);

    useEffect(() => {
        fetchViajes();
    }, []);

    const fetchViajes = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('viajes')
                .select('*')
                .eq('estado', 'programado')
                .gt('asientos_disponibles', 0)
                .order('fecha', { ascending: true })
                .order('hora_salida', { ascending: true });

            if (error) throw error;
            setViajes(data || []);
        } catch (error: any) {
            console.error('Error al cargar viajes:', error);
            Alert.alert('Error', 'No se pudieron cargar los viajes disponibles');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBusSelection = (viajeId: string) => {
        setSelectedViajeId(viajeId);
    };

    const handleBackToBus = () => {
        setSelectedViajeId(null);
    };

    const handleConfirmReservation = async (seatId: string) => {
        if (!authUser?.id) {
            Alert.alert('Error', 'Debes iniciar sesión para reservar un asiento');
            return;
        }

        if (!selectedViajeId) {
            Alert.alert('Error', 'No se pudo identificar el viaje. Por favor intenta de nuevo.');
            return;
        }

        setIsReserving(true);

        try {
            // Verificar si el asiento ya está reservado
            const { data: existingReserva, error: checkError } = await supabase
                .from('reservas')
                .select('id')
                .eq('viaje_id', selectedViajeId)
                .eq('asiento_numero', seatId)
                .eq('estado', 'confirmada')
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingReserva) {
                Alert.alert('Asiento Ocupado', 'Este asiento acaba de ser reservado por otro usuario.');
                setIsReserving(false);
                return;
            }

            // Crear la reserva
            const { error: insertError } = await supabase
                .from('reservas')
                .insert({
                    viaje_id: selectedViajeId,
                    pasajero_id: authUser.id,
                    asiento_numero: seatId,
                    estado: 'confirmada'
                });

            if (insertError) throw insertError;

            // Obtener el viaje actual para actualizar asientos
            const viaje = viajes.find(v => v.id === selectedViajeId);
            
            if (viaje) {
                // Actualizar asientos disponibles del viaje
                const { error: updateError } = await supabase
                    .from('viajes')
                    .update({ 
                        asientos_disponibles: viaje.asientos_disponibles - 1 
                    })
                    .eq('id', selectedViajeId);

                if (updateError) {
                    console.error('Error al actualizar asientos disponibles:', updateError);
                }
            }

            const selectedViaje = viajes.find(v => v.id === selectedViajeId);

            Alert.alert(
                '¡Reserva Exitosa!',
                `Has reservado el asiento ${seatId} en ${selectedViaje?.ruta_nombre || 'el viaje'} con salida a las ${selectedViaje?.hora_salida || 'N/A'}.`,
                [{ 
                    text: 'Aceptar', 
                    onPress: () => {
                        setSelectedViajeId(null);
                        fetchViajes(); // Recargar viajes para actualizar disponibilidad
                        router.back();
                    }
                }]
            );
        } catch (error: any) {
            console.error('Error al crear reserva:', error);
            Alert.alert(
                'Error',
                'No se pudo completar la reserva: ' + (error.message || 'Error desconocido')
            );
        } finally {
            setIsReserving(false);
        }
    };
    
    const getScreenTitle = () => {
        if (selectedViajeId) {
            const viaje = viajes.find(v => v.id === selectedViajeId);
            return `Asientos: ${viaje?.ruta_nombre || 'Cargando...'}`;
        }
        return 'Reservar Lugar';
    };

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{
                    headerShown: true,
                    title: getScreenTitle(),
                    headerStyle: { backgroundColor: PRIMARY_COLOR },
                    headerTintColor: 'white',
                    headerLeft: () => selectedViajeId ? (
                        <Pressable onPress={handleBackToBus} style={{ padding: 5 }}>
                            <Text style={{ color: 'white', fontSize: 16, marginLeft: 10 }}>&lt; Volver</Text>
                        </Pressable>
                    ) : undefined
                }} 
            />

            {selectedViajeId ? (
                <SeatSelection 
                    viajeId={selectedViajeId}
                    onBack={handleBackToBus}
                    onConfirmReservation={handleConfirmReservation}
                    userType={userType}
                />
            ) : (
                <BusSelection 
                    viajes={viajes}
                    onSelectBus={handleBusSelection}
                    isLoading={isLoading}
                />
            )}

            {/* Indicador de carga durante la reserva */}
            {isReserving && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                        <Text style={styles.loadingText}>Procesando reserva...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// --- ESTILOS ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: PRIMARY_COLOR,
        fontWeight: '600',
    },
});

const stepStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 15,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    busCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        gap: 15,
    },
    busIconPlaceholder: {
        width: 48,
        height: 48,
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    busIconText: {
        fontSize: 24,
    },
    busInfo: {
        flex: 1,
    },
    busRoute: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    busDetail: {
        fontSize: 13,
        color: '#6B7280',
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    backButton: {
        marginRight: 10,
        padding: 5,
    },
    backButtonText: {
        fontSize: 16,
        color: PRIMARY_COLOR,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
});

const seatStyles = StyleSheet.create({
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#4B5563',
    },
    mapContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 250,
        marginBottom: 10,
    },
    seatGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    aisle: {
        width: 30,
    },
    seat: {
        width: 50,
        height: 50,
        borderWidth: 2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    seatEmoji: {
        fontSize: 18, 
    },
    seatText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    reserveButton: {
        flexDirection: 'row',
        backgroundColor: AVAILABLE_COLOR,
        paddingVertical: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    reserveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    reserveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
});