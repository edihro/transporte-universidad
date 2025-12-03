import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import DriverLocationTracker from '../components/DriverLocationTracker';

const PRIMARY_COLOR = '#1C3F60';

export default function LocationTrackingScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    headerShown: true,
                    headerTitle: 'Seguimiento en Vivo',
                    headerStyle: {
                        backgroundColor: PRIMARY_COLOR,
                    },
                    headerTintColor: 'white',
                    headerLeft: () => (
                        <Pressable 
                            onPress={() => router.back()}
                            style={{ marginLeft: 10 }}
                        >
                            <ArrowLeft size={24} color="white" />
                        </Pressable>
                    ),
                }} 
            />
            
            <ScrollView style={styles.content}>
                <View style={styles.infoContainer}>
                    <Text style={styles.infoTitle}>Seguimiento de Ubicación</Text>
                    <Text style={styles.infoText}>
                        Activa el seguimiento para compartir tu ubicación en tiempo real con los pasajeros. 
                        Esto les permitirá saber dónde te encuentras durante tu ruta.
                    </Text>
                </View>

                <DriverLocationTracker />
                
                <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>💡 Consejos</Text>
                    <Text style={styles.tipText}>• Activa el seguimiento al iniciar tu ruta</Text>
                    <Text style={styles.tipText}>• Asegúrate de tener GPS activado</Text>
                    <Text style={styles.tipText}>• El seguimiento consume batería</Text>
                    <Text style={styles.tipText}>• Desactívalo cuando termines tu ruta</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        flex: 1,
    },
    infoContainer: {
        backgroundColor: 'white',
        padding: 20,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    tipsContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
    },
    tipText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 4,
    },
});