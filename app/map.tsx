import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Navigation, ArrowLeft, Bus, Users, Map } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';
const USER_COLOR = '#FF0000'; // Color para la ubicación del usuario
const BUS_COLOR = '#3B82F6'; // Color para los autobuses

// Datos de ubicación de autobuses (AHORA EN ESCUINAPA)
const busLocations = [
    { id: 1, route: 'Ruta 1', driver: 'Juan Pérez', lat: 22.8320, lng: -105.7730, passengers: 15 },
    { id: 2, route: 'Ruta 2', driver: 'María López', lat: 22.8280, lng: -105.7780, passengers: 22 },
    { id: 3, route: 'Ruta 3', driver: 'Carlos García', lat: 22.8290, lng: -105.7710, passengers: 8 },
];

export default function MapScreen() {
    const router = useRouter();
    // Valor inicial centrado en Escuinapa (se actualizará con la ubicación real)
    const [currentLocation, setCurrentLocation] = useState({ lat: 22.8300, lng: -105.7750 }); 
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [selectedBus, setSelectedBus] = useState<number | null>(null);
    const [mapHtml, setMapHtml] = useState('');

    // Obtener ubicación del dispositivo al cargar el componente
    useEffect(() => {
        requestLocationPermission();
    }, []);

    // Actualizar el HTML del mapa cuando cambie la ubicación o los datos de los buses
    useEffect(() => {
        // Solo generamos el mapa si la ubicación no está en el estado inicial de carga
        if (!isLoadingLocation) {
            setMapHtml(generateMapHtml(currentLocation, busLocations));
        }
    }, [currentLocation, isLoadingLocation]); // Depende de la ubicación y el estado de carga

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status === 'granted') {
                await getCurrentLocation();
            } else {
                Alert.alert('Permiso Denegado', 'Se necesita permiso de ubicación para ver el mapa centrado en ti.');
                // Usamos la ubicación predeterminada (Escuinapa) si no hay permiso
                setIsLoadingLocation(false); 
            }
        } catch (error) {
            console.error('Error al solicitar permisos:', error);
            setIsLoadingLocation(false);
        }
    };

    const getCurrentLocation = async () => {
        try {
            setIsLoadingLocation(true);
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000, // Opcional: obtener cada 5 segundos para simular tiempo real
            });

            setCurrentLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            });
            
            setIsLoadingLocation(false);
        } catch (error) {
            console.error('Error al obtener ubicación:', error);
            Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
            setIsLoadingLocation(false);
        }
    };

    const generateMapHtml = (location, buses) => {
        // Se centra el mapa en la ubicación del usuario (location)
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #E5E7EB; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
        // 1. Centrar el mapa en la ubicación del usuario
        const map = L.map('map').setView([${location.lat}, ${location.lng}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 2. Marcador de usuario (Círculo Rojo)
        L.circleMarker([${location.lat}, ${location.lng}], {
            radius: 10,
            fillColor: '${USER_COLOR}',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup('Tu ubicación actual').openPopup();

        // 3. Marcadores de autobuses (Círculos Azules)
        const busIcon = L.divIcon({
            className: 'custom-bus-icon',
            html: '<div style="background-color: ${BUS_COLOR}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">🚍</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const busData = ${JSON.stringify(buses)};
        busData.forEach(bus => {
            L.marker([bus.lat, bus.lng], { icon: busIcon })
            .addTo(map)
            .bindPopup(\`<b>\${bus.route}</b><br>Conductor: \${bus.driver}<br>Pasajeros: \${bus.passengers}\`);
        });
    } catch (e) {
        document.body.innerHTML = \`<h1 style='color: red;'>Error en JS: \${e.message}</h1>\`;
    }
  </script>
</body>
</html>
    `;
    };

    const handleBusSelect = (busId: number) => {
        setSelectedBus(busId === selectedBus ? null : busId);
    };

    const requestRide = (routeName: string) => {
        Alert.alert('Solicitar Viaje', `¿Deseas solicitar un viaje en ${routeName}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', onPress: () => Alert.alert('Éxito', 'Solicitud enviada al conductor. ¡Mantente atento!') }
        ]);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Mapa de Rutas en Vivo',
                headerStyle: { backgroundColor: PRIMARY_COLOR },
                headerTintColor: 'white',
                headerLeft: () => (
                    <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
                        <ArrowLeft size={24} color="white" />
                    </Pressable>
                ),
            }} />

            {/* Mapa Web */}
            <View style={styles.mapContainer}>
                {mapHtml ? (
                    <WebView
                        source={{ html: mapHtml }}
                        style={styles.webView}
                        scrollEnabled={true}
                        zoomEnabled={true}
                        originWhitelist={['*']} 
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('Error de WebView:', nativeEvent);
                        }}
                    />
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
                    </View>
                )}

                {/* Botón de ubicación (re-centrar / refrescar) */}
                <Pressable 
                    style={styles.locationButton}
                    onPress={getCurrentLocation}
                    disabled={isLoadingLocation}
                >
                    {isLoadingLocation ? (
                        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                    ) : (
                        <Map size={24} color={PRIMARY_COLOR} /> 
                    )}
                </Pressable>
            </View>

            {/* Lista de autobuses */}
            <ScrollView style={styles.busList}>
                <Text style={styles.busListTitle}>Autobuses Activos</Text>
                
                {busLocations.map((bus) => (
                    <Pressable
                        key={bus.id}
                        style={[
                            styles.busCard,
                            selectedBus === bus.id && styles.busCardSelected
                        ]}
                        onPress={() => handleBusSelect(bus.id)}
                    >
                        <View style={styles.busCardHeader}>
                            <View style={styles.busCardLeft}>
                                <View style={styles.busIconContainer}>
                                    <Bus size={24} color="white" />
                                </View>
                                <View>
                                    <Text style={styles.busRouteName}>{bus.route}</Text>
                                    <Text style={styles.busDriverName}>Conductor: {bus.driver}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.passengersContainer}>
                                <Users size={18} color="#6B7280" />
                                <Text style={styles.passengersText}>{bus.passengers}</Text>
                            </View>
                        </View>

                        {selectedBus === bus.id && (
                            <View style={styles.busCardDetails}>
                                <Text style={styles.busDetailText}>
                                    📍 Ubicación: {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                                </Text>
                                <Text style={styles.busDetailText}>
                                    ⏱️ Tiempo estimado: **5-10 min** (al punto de recogida)
                                </Text>
                                
                                <Pressable 
                                    style={styles.requestButton}
                                    onPress={() => requestRide(bus.route)}
                                >
                                    <Text style={styles.requestButtonText}>Solicitar Viaje Aquí</Text>
                                </Pressable>
                            </View>
                        )}
                    </Pressable>
                ))}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Leyenda */}
            <View style={styles.legend}>
                <View style={styles.legendRow}>
                    <MapPin size={14} color={USER_COLOR} style={{ marginRight: 5 }} />
                    <Text style={[styles.legendText, { color: USER_COLOR }]}>Tu Ubicación</Text>
                    <Bus size={14} color={BUS_COLOR} style={{ marginLeft: 15, marginRight: 5 }} />
                    <Text style={[styles.legendText, { color: BUS_COLOR }]}>Autobús de Ruta</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    mapContainer: {
        height: 350, // Un poco más alto para mejor vista
        position: 'relative',
        backgroundColor: '#E5E7EB',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: PRIMARY_COLOR,
    },
    locationButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'white',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    busList: {
        flex: 1,
        padding: 15,
    },
    busListTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 15,
    },
    busCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    busCardSelected: {
        borderWidth: 2,
        borderColor: ACCENT_COLOR,
    },
    busCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    busCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    busIconContainer: {
        backgroundColor: ACCENT_COLOR,
        width: 45,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    busRouteName: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_COLOR,
    },
    busDriverName: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    passengersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    passengersText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    busCardDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    busDetailText: {
        fontSize: 13,
        color: '#4B5563',
        marginBottom: 6,
    },
    requestButton: {
        backgroundColor: '#10B981',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    requestButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    legend: {
        backgroundColor: 'white',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendText: {
        fontSize: 12,
        fontWeight: '600',
    },
});