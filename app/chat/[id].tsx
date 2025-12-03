import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    Pressable, 
    Alert, 
    FlatList, 
    ActivityIndicator, 
    Image, 
    Keyboard,
    Platform
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'; 
import { supabase } from '../../context/supabase_client';
import { useUser } from '../../context/UserContext';
import { Send, ArrowLeft, UserCircle2 } from 'lucide-react-native';

const PRIMARY_COLOR = '#1C3F60';
const CHAT_BACKGROUND = '#ECE5DD';
const MY_MESSAGE_GREEN = '#DCF8C6';
const THEIR_MESSAGE_WHITE = '#FFFFFF';
const SEND_BUTTON_GREEN = '#075E54';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function ChatScreen() {
    const router = useRouter();
    const { user } = useUser(); 
    
    const { id: receiverId, receiverName, receiverProfilePic } = useLocalSearchParams(); 
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const senderId = user?.uid;
    const currentReceiverId = receiverId as string;
    const currentProfilePic = receiverProfilePic as string | undefined;

    // Cargar mensajes iniciales
    useEffect(() => {
        if (senderId) {
            fetchMessages();
        }
    }, [senderId]);

    // Listener para el teclado
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    // Suscripción a Realtime
    useEffect(() => {
        if (!senderId) return;

        const channel = supabase
            .channel(`chat_${senderId}_${currentReceiverId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'direct_messages',
                filter: `and(receiver_id.eq.${senderId},sender_id.eq.${currentReceiverId})`
            }, (payload) => {
                setMessages(currentMessages => [...currentMessages, payload.new as Message]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [senderId, currentReceiverId]);

    const fetchMessages = async () => {
        if (!senderId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${senderId},receiver_id.eq.${currentReceiverId}),and(sender_id.eq.${currentReceiverId},receiver_id.eq.${senderId})`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setMessages(data || []);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudieron cargar los mensajes: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !senderId) return;

        const content = newMessage.trim();
        setNewMessage(''); 

        try {
            const { data, error } = await supabase
                .from('direct_messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: currentReceiverId,
                    content: content
                })
                .select() 
                .single(); 

            if (error) throw error;

            setMessages(currentMessages => [...currentMessages, data as Message]);

        } catch (error: any) {
            Alert.alert('Error', 'No se pudo enviar el mensaje.');
            setNewMessage(content); 
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMyMessage = item.sender_id === senderId;
        return (
            <View 
                style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.theirMessage
                ]}
            >
                <Text style={styles.messageText}>
                    {item.content}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                headerStyle: { 
                    backgroundColor: PRIMARY_COLOR,
                },
                headerTintColor: 'white',
                headerTitleAlign: 'left',
                headerTitle: () => (
                    <Pressable 
                        onPress={() => {
                            console.log('Ver perfil de', receiverName);
                        }}
                        style={styles.headerTitleContainer}
                    >
                        {currentProfilePic && currentProfilePic.length > 0 ? (
                            <Image source={{ uri: currentProfilePic }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatarPlaceholder}>
                                <UserCircle2 size={28} color="#9CA3AF" />
                            </View>
                        )}
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerName}>
                                {(receiverName as string) || 'Chat'}
                            </Text>
                            
                        </View>
                    </Pressable>
                ),
                headerLeft: () => (
                    <Pressable 
                        onPress={() => router.push('/(tabs)/messages')}
                        style={styles.headerBackButton}
                    >
                        <ArrowLeft size={24} color="white" />
                    </Pressable>
                ),
            }} />

            <View style={{ flex: 1 }}>
                {isLoading ? (
                    <ActivityIndicator style={{ flex: 1 }} size="large" color={PRIMARY_COLOR} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[
                            styles.chatContainer,
                            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 70 : 70 }
                        ]}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                <View style={[
                    styles.inputContainer,
                    { bottom: keyboardHeight }
                ]}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <Pressable 
                        style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]} 
                        onPress={handleSend}
                        disabled={!newMessage.trim()}
                    >
                        <Send size={24} color="white" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CHAT_BACKGROUND, 
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -10,
    },
    headerBackButton: {
        marginLeft: 10,
        paddingVertical: 5,
        paddingRight: 15,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    headerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flexDirection: 'column',
    },
    headerName: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
    },
    headerStatus: {
        color: '#D1D5DB',
        fontSize: 12,
    },
    chatContainer: {
        padding: 10,
    },
    messageBubble: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 18,
        maxWidth: '80%',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    myMessage: {
        backgroundColor: MY_MESSAGE_GREEN, 
        alignSelf: 'flex-end',
        borderBottomRightRadius: 5, 
    },
    theirMessage: {
        backgroundColor: THEIR_MESSAGE_WHITE, 
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 5, 
    },
    messageText: {
        fontSize: 16,
        color: '#111', 
    },
    inputContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: '#F0F0F0', 
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#FFFFFF', 
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    sendButton: {
        backgroundColor: SEND_BUTTON_GREEN, 
        padding: 12,
        borderRadius: 25, 
    },
    sendButtonDisabled: {
        backgroundColor: '#9CA3AF',
    }
});