import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bus, Save, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../context/supabase_client';

const PRIMARY_COLOR = '#1C3F60';
const ACCENT_COLOR = '#3B82F6';

export default function CrearUnidadScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        placa: '',
        modelo: '',
        capacidad: '',
    });

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreate = async () => {
        if (!formData.placa || !formData.modelo || !formData.capacidad) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        setIsLoading(true);
        try {
            // CORRECCIÓN: Usamos la tabla 'unidades' y la columna 'nombre_unidad'
            // según tu captura de pantalla de Supabase
            const { error } = await supabase
                .from('unidades') 
                .insert([
                    {
                        placa: formData.placa.toUpperCase(),
                        nombre_unidad: formData.modelo, // Mapeamos modelo -> nombre_unidad
                        capacidad: parseInt(formData.capacidad),
                        estado: 'disponible' // O el estado por defecto que prefieras
                    }
                ]);

            if (error) throw error;

            Alert.alert(
                'Éxito',
                'Unidad registrada correctamente',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo registrar la unidad');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Registrar Unidad',
                headerStyle: { backgroundColor: PRIMARY_COLOR },
                headerTintColor: 'white',
                headerLeft: () => (
                    <Pressable onPress={() => router.back()} style={{ marginRight: 15 }}>
                        <ArrowLeft color="white" size={24} />
                    </Pressable>
                )
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconContainer}>
                    <Bus size={64} color={PRIMARY_COLOR} />
                </View>

                <Text style={styles.title}>Nueva Unidad</Text>
                <Text style={styles.subtitle}>Registra un nuevo camión en el sistema</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Placa del Vehículo</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: ABC-123"
                            value={formData.placa}
                            onChangeText={(t) => handleChange('placa', t)}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Modelo / Nombre Unidad</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Camión 01"
                            value={formData.modelo}
                            onChangeText={(t) => handleChange('modelo', t)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Capacidad de Asientos</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 40"
                            value={formData.capacidad}
                            onChangeText={(t) => handleChange('capacidad', t.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                        />
                    </View>

                    <Pressable
                        style={styles.saveButton}
                        onPress={handleCreate}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text style={styles.saveButtonText}>Guardar Unidad</Text>
                            </>
                        )}
                    </Pressable>
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
        padding: 20,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30,
    },
    form: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
    },
    saveButton: {
        backgroundColor: ACCENT_COLOR,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 10,
        marginTop: 10,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});