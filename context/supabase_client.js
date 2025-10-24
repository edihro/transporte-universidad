import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://xlwtaflqkczuaqfbajvu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsd3RhZmxxa2N6dWFxZmJhanZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjQwNzcsImV4cCI6MjA3NjQ0MDA3N30.-SW1f3xlbeHBjclvBZyrL4Q-LEs2Zv6y-11xgDhcfj4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

/**
 * Obtiene el ID del rol basado en su nombre
 */
async function obtenerIdRol(nombreRol) {
    const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', nombreRol.toLowerCase())
        .single();

    if (error) {
        console.error(`Error al buscar el rol ${nombreRol}:`, error);
        return null;
    }
    return data ? data.id : null;
}

/**
 * Registra un nuevo perfil de usuario
 */
export async function registrarPerfilUsuario(uid, nombreUsuario, nombreRol, nombreCompleto = '') {
    try {
        const rolId = await obtenerIdRol(nombreRol);

        if (rolId === null) {
            return { 
                error: { 
                    message: `Rol '${nombreRol}' no encontrado. Usa 'pasajero' o 'conductor'.` 
                } 
            };
        }

        const { data, error } = await supabase
            .from('perfiles')
            .insert([
                {
                    id: uid,
                    nombre_usuario: nombreUsuario,
                    nombre_completo: nombreCompleto,
                    rol_id: rolId,
                    estado: 'activo'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error al guardar perfil:', error);
            if (error.code === '23505') {
                return { 
                    error: { 
                        message: 'El nombre de usuario ya está registrado. Elige otro.' 
                    } 
                };
            }
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en registrarPerfilUsuario:', err);
        return { error: err };
    }
}

/**
 * Obtiene el perfil completo de un usuario
 */
export async function obtenerPerfilUsuario(uid) {
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .select(`
                id,
                nombre_usuario,
                nombre_completo,
                email,
                rol_id,
                roles (id, nombre),
                telefono,
                estado,
                creado_en
            `)
            .eq('id', uid)
            .single();

        if (error) {
            console.error('Error al obtener perfil:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en obtenerPerfilUsuario:', err);
        return { error: err };
    }
}

/**
 * Actualiza el perfil del usuario
 */
export async function actualizarPerfilUsuario(uid, datosActualizar) {
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .update({
                ...datosActualizar,
                actualizado_en: new Date()
            })
            .eq('id', uid)
            .select()
            .single();

        if (error) {
            console.error('Error al actualizar perfil:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en actualizarPerfilUsuario:', err);
        return { error: err };
    }
}

/**
 * Obtiene todos los viajes disponibles
 */
export async function obtenerViajes() {
    try {
        const { data, error } = await supabase
            .from('viajes')
            .select(`
                id,
                conductor_id,
                origen_nombre,
                destino_nombre,
                horario_salida,
                horario_llegada,
                asientos_disponibles,
                asientos_totales,
                precio_por_pasajero,
                estado,
                placa_vehiculo,
                perfiles!viajes_conductor_id_fkey (nombre_usuario)
            `)
            .eq('estado', 'disponible')
            .gte('horario_salida', new Date().toISOString())
            .order('horario_salida', { ascending: true });

        if (error) {
            console.error('Error al obtener viajes:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en obtenerViajes:', err);
        return { error: err };
    }
}

/**
 * Crea una nueva reserva
 */
export async function crearReserva(viajeId, pasajeroId, cantidadAsientos) {
    try {
        const { data: viaje, error: errorViaje } = await supabase
            .from('viajes')
            .select('precio_por_pasajero')
            .eq('id', viajeId)
            .single();

        if (errorViaje) {
            return { error: errorViaje };
        }

        const precioTotal = viaje.precio_por_pasajero * cantidadAsientos;

        const { data, error } = await supabase
            .from('reservas')
            .insert([
                {
                    viaje_id: viajeId,
                    pasajero_id: pasajeroId,
                    cantidad_asientos: cantidadAsientos,
                    precio_total: precioTotal,
                    estado: 'pendiente'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error al crear reserva:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en crearReserva:', err);
        return { error: err };
    }
}

/**
 * Obtiene las reservas de un pasajero
 */
export async function obtenerReservasPasajero(pasajeroId) {
    try {
        const { data, error } = await supabase
            .from('reservas')
            .select(`
                id,
                viaje_id,
                cantidad_asientos,
                precio_total,
                estado,
                fecha_reserva,
                viajes (
                    origen_nombre,
                    destino_nombre,
                    horario_salida,
                    horario_llegada,
                    placa_vehiculo
                )
            `)
            .eq('pasajero_id', pasajeroId)
            .order('fecha_reserva', { ascending: false });

        if (error) {
            console.error('Error al obtener reservas:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en obtenerReservasPasajero:', err);
        return { error: err };
    }
}

/**
 * Cancela una reserva
 */
export async function cancelarReserva(reservaId, razon = '') {
    try {
        const { data, error } = await supabase
            .from('reservas')
            .update({
                estado: 'cancelada',
                fecha_cancelacion: new Date(),
                razon_cancelacion: razon
            })
            .eq('id', reservaId)
            .select()
            .single();

        if (error) {
            console.error('Error al cancelar reserva:', error);
            return { error };
        }

        return { data };
    } catch (err) {
        console.error('Error en cancelarReserva:', err);
        return { error: err };
    }
}