import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../context/supabase_client';
import { Picker } from '@react-native-picker/picker';
import { Shield, Bus, User, Send, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useUser } from '../context/UserContext';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

// Tipos para nuestros datos
interface PerfilDriver {
  id: string;
  nombre_usuario: string;
}
interface Unidad {
  id: string;
  nombre_unidad: string;
  placa: string;
  capacidad: number;
}

export default function CrearViajeScreen() {
    const router = useRouter();
    const { user: profileUser } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Verificación de permisos
    useEffect(() => {
        if (profileUser && profileUser.type !== 'administrador') {
            Alert.alert(
                'Acceso Denegado',
                'Solo los administradores pueden crear viajes.',
                [
                    {
                        text: 'Entendido',
                        onPress: () => router.back()
                    }
                ]
            );
        }
    }, [profileUser]);

    // Si no es administrador, mostrar pantalla de acceso denegado
    if (!profileUser || profileUser.type !== 'administrador') {
        return (
            <View style={styles.fullContainer}>
                <View style={styles.header}>
                    <Pressable 
                        onPress={() => router.back()} 
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="white" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Crear Viaje</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <AlertCircle size={64} color="#EF4444" />
                    <Text style={styles.deniedTitle}>Acceso Denegado</Text>
                    <Text style={styles.deniedText}>
                        Solo los administradores pueden crear viajes.
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

    // Listas para los Pickers
    const [drivers, setDrivers] = useState<PerfilDriver[]>([]);
    const [units, setUnits] = useState<Unidad[]>([]);

    // Estado del Formulario
    const [rutaNombre, setRutaNombre] = useState('');
    const [origen, setOrigen] = useState('Escuinapa de Hidalgo');
    const [destino, setDestino] = useState('Universidad');
    const [fecha, setFecha] = useState('2025-11-07'); // YYYY-MM-DD
    const [hora, setHora] = useState('07:00'); // HH:MM
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

    // Cargar conductores y unidades al montar la pantalla
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Cargar Conductores
            const { data: driversData, error: driversError } = await supabase
                .from('perfiles')
                .select('id, nombre_usuario')
                .eq('rol_id', 2); // Usamos rol_id: 2 (conductor)
            
            if (driversError) throw driversError;
            setDrivers(driversData || []);

            // 2. Cargar Unidades (Camiones)
            const { data: unitsData, error: unitsError } = await supabase
                .from('unidades')
                .select('id, nombre_unidad, placa, capacidad')
                .eq('estado', 'disponible');

            if (unitsError) throw unitsError;
            setUnits(unitsData || []);

        } catch (error: any) {
            Alert.alert('Error', 'No se pudieron cargar los datos: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTrip = async () => {
        if (!rutaNombre || !origen || !destino || !fecha || !hora || !selectedDriver || !selectedUnit) {
            Alert.alert('Campos incompletos', 'Por favor, llena todos los campos para crear el viaje.');
            return;
        }

        setIsSaving(true);
        try {
            const unit = units.find(u => u.id === selectedUnit);
            if (!unit) {
                throw new Error('Unidad seleccionada no encontrada.');
            }

            const timestampSalida = `${fecha} ${hora}:00`;

            const { data, error } = await supabase
                .from('viajes')
                .insert({
                    origen_nombre: origen,
                    horario_salida: timestampSalida,
                    ruta_nombre: rutaNombre,
                    origen: origen,             
                    destino: destino,           
                    destino_nombre: destino,
                    fecha: fecha,
                    hora_salida: hora, 
                    conductor_id: selectedDriver,
                    unidad_id: selectedUnit,
                    asientos_totales: unit.capacidad,
                    asientos_disponibles: unit.capacidad, 
                    placa_vehiculo: unit.placa,         
                    estado: 'programado'
                })
                .select()
                .single();

            if (error) throw error;
            
            Alert.alert('Éxito', `Viaje "${data.ruta_nombre}" creado correctamente.`);
            // Limpiar formulario y recargar datos
            setRutaNombre('');
            setOrigen('Escuinapa de Hidalgo');
            setDestino('Universidad');
            setFecha('2025-11-07');
            setHora('07:00');
            setSelectedDriver(null);
            setSelectedUnit(null);
            fetchData(); 

        } catch (error: any) {
            Alert.alert('Error al crear el viaje', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.fullContainer}>
            {/* Header personalizado */}
            <View style={styles.header}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Crear Viaje</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scrollContainer}>
                <View style={styles.container}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Bus size={22} color={PRIMARY_COLOR} />
                            <Text style={styles.cardTitle}>Programar Nuevo Viaje</Text>
                        </View>
                        
                        <Text style={styles.label}>Nombre de la Ruta</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. Ruta Matutina 1"
                            value={rutaNombre}
                            onChangeText={setRutaNombre}
                        />

                        <Text style={styles.label}>Origen</Text>
                        <TextInput
                            style={styles.input}
                            value={origen}
                            onChangeText={setOrigen}
                        />

                        <Text style={styles.label}>Destino</Text>
                        <TextInput
                            style={styles.input}
                            value={destino}
                            onChangeText={setDestino}
                        />
                        
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Fecha</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={fecha}
                                    onChangeText={setFecha}
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Hora</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="HH:MM (24h)"
                                    value={hora}
                                    onChangeText={setHora}
                                />
                            </View>
                        </View>
                        <Text style={styles.label}>Asignar Conductor</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedDriver}
                                onValueChange={(itemValue) => setSelectedDriver(itemValue)}
                                style={styles.picker}
                                dropdownIconColor={PRIMARY_COLOR}
                            >
                                <Picker.Item label="-- Selecciona un conductor --" value={null} enabled={false} />
                                {drivers.map(driver => (
                                    <Picker.Item key={driver.id} label={driver.nombre_usuario} value={driver.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.label}>Asignar Unidad (Camión)</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedUnit}
                                onValueChange={(itemValue) => setSelectedUnit(itemValue)}
                                style={styles.picker}
                                dropdownIconColor={PRIMARY_COLOR}
                            >
                                <Picker.Item label="-- Selecciona una unidad --" value={null} enabled={false} />
                                {units.map(unit => (
                                    <Picker.Item key={unit.id} label={`${unit.nombre_unidad} (${unit.placa})`} value={unit.id} />
                                ))}
                            </Picker>
                        </View>
                        
                        <Pressable 
                            style={[styles.button, (isSaving || !selectedDriver || !selectedUnit) && styles.buttonDisabled]}
                            onPress={handleCreateTrip}
                            disabled={isSaving || !selectedDriver || !selectedUnit}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Send size={18} color="white" />
                            )}
                            <Text style={styles.buttonText}>
                                {isSaving ? 'Creando...' : 'Crear Viaje Programado'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
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
        width: 34, // Mismo ancho que el botón de regresar para centrar el título
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
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 10,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#1F2937',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    halfInput: {
        flex: 1,
    },
    pickerContainer: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        justifyContent: 'center',
    },
    picker: {
        color: '#1F2937',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 10,
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});