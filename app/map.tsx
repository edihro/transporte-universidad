import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Navigation, ArrowLeft, Bus, Users } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

const busLocations = [
  { id: 1, route: 'Ruta 1', driver: 'Juan Pérez', lat: 19.7052, lng: -99.3208, passengers: 15 },
  { id: 2, route: 'Ruta 2', driver: 'María López', lat: 19.7102, lng: -99.3258, passengers: 22 },
  { id: 3, route: 'Ruta 3', driver: 'Carlos García', lat: 19.7002, lng: -99.3158, passengers: 8 },
];

export default function MapScreen() {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState({ lat: 19.7076, lng: -99.3233 });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedBus, setSelectedBus] = useState<number | null>(null);
  const [mapHtml, setMapHtml] = useState('');

  // Obtener ubicación del dispositivo al cargar el componente
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Actualizar el HTML del mapa cuando cambie la ubicación
  useEffect(() => {
    setMapHtml(generateMapHtml(currentLocation));
  }, [currentLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert('Permiso Denegado', 'Se necesita permiso de ubicación para ver el mapa');
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
      });

      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      
      setIsLoadingLocation(false);
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      setIsLoadingLocation(false);
    }
  };

  const generateMapHtml = (location) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .marker-icon { background: #3B82F6; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; }
    .marker-user { background: #FF0000 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${location.lat}, ${location.lng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Marcador de usuario - UBICACIÓN REAL
    L.circleMarker([${location.lat}, ${location.lng}], {
      radius: 10,
      fillColor: '#FF0000',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map).bindPopup('Tu ubicación actual');

    // Marcadores de autobuses
    const buses = ${JSON.stringify(busLocations)};
    buses.forEach(bus => {
      L.circleMarker([bus.lat, bus.lng], {
        radius: 12,
        fillColor: '#3B82F6',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map).bindPopup(\`<b>\${bus.route}</b><br>Conductor: \${bus.driver}<br>Pasajeros: \${bus.passengers}\`);
    });
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
      { text: 'Confirmar', onPress: () => Alert.alert('Éxito', 'Solicitud enviada al conductor') }
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Mapa en Tiempo Real',
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
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
          </View>
        )}

        {/* Botón de ubicación */}
        <Pressable 
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          ) : (
            <Navigation size={24} color={PRIMARY_COLOR} />
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
                  ⏱️ Tiempo estimado: 5-10 min
                </Text>
                
                <Pressable 
                  style={styles.requestButton}
                  onPress={() => requestRide(bus.route)}
                >
                  <Text style={styles.requestButtonText}>Solicitar Viaje</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Leyenda */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          💡 Toca un autobús para ver más detalles
        </Text>
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
    height: 300,
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
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },
  legendText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});