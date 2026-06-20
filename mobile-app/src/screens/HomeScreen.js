import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, disconnect, getSocket } from '../services/socket';
import { requestPermissionsAsync, showLocalNotification } from '../services/notifications';

export default function HomeScreen() {
  const [serverUrl, setServerUrl] = useState('http://10.7.4.252:3000');
  const [connected, setConnected] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [lastMotion, setLastMotion] = useState(null);
  const [logs, setLogs] = useState([]);
  const scrollRef = useRef(null);

  const addLog = (msg) => {
    setLogs((prev) => {
      const next = [...prev, { time: new Date().toLocaleTimeString(), msg }];
      return next.slice(-50);
    });
  };

  useEffect(() => {
    requestPermissionsAsync().then((granted) => {
      setNotifGranted(granted);
      addLog(granted ? 'Notificaciones activadas' : 'Notificaciones denegadas');
    });
  }, []);

  useEffect(() => {
    const socket = connect(serverUrl);

    socket.on('connect', () => {
      setConnected(true);
      addLog('Conectado al servidor edge');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      setDetecting(false);
      addLog(`Desconectado: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      addLog(`Error de conexión: ${err.message}`);
    });

    socket.on('status', (data) => {
      setDetecting(data.running);
    });

    if (socket.connected) {
      setConnected(true);
      addLog('Conectado al servidor edge');
    }

    socket.on('motion_frame', (data) => {
      setLastMotion(data);
      if (data.motionDetected) {
        addLog(`🔴 Movimiento! Score: ${data.score.toFixed(1)}`);
        showLocalNotification(
          '🚨 Movimiento Detectado',
          `Movimiento detectado (score: ${data.score.toFixed(1)}) a las ${new Date().toLocaleTimeString()}`
        );
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('status');
      socket.off('motion_frame');
    };
  }, [serverUrl]);

  const handleStart = () => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('start');
      addLog('Iniciando detección de movimiento...');
    }
  };

  const handleStop = () => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('stop');
      addLog('Deteniendo detección...');
    }
  };

  const handleReconnect = () => {
    disconnect();
    connect(serverUrl);
    addLog(`Conectando a ${serverUrl}...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>🎥 AlertaCamara</Text>
        <Text style={styles.subtitle}>Detección de movimiento edge</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Servidor Edge</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100:3000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.smallBtn} onPress={handleReconnect}>
              <Text style={styles.smallBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: connected ? '#00ff88' : '#ff4444' },
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Control</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnStart]}
              onPress={handleStart}
              disabled={!connected || detecting}
            >
              <Text style={styles.btnText}>Iniciar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnStop]}
              onPress={handleStop}
              disabled={!connected || !detecting}
            >
              <Text style={styles.btnText}>Detener</Text>
            </TouchableOpacity>
          </View>

          {detecting && (
            <View style={styles.detectingBadge}>
              <Text style={styles.detectingText}>🔴 Detectando...</Text>
            </View>
          )}

          {lastMotion && (
            <View style={styles.motionInfo}>
              <Text style={styles.infoText}>
                Último score: {lastMotion.score.toFixed(1)} / {lastMotion.threshold}
              </Text>
              <Text style={styles.infoText}>
                Movimiento: {lastMotion.motionDetected ? '✅ Sí' : '❌ No'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Notificaciones</Text>
          <Text style={styles.statusText}>
            {notifGranted ? '✅ Permiso concedido' : '❌ Sin permiso'}
          </Text>
          <Text style={styles.hintText}>
            Las notificaciones locales se mostrarán automáticamente cuando se detecte movimiento.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Logs</Text>
          <ScrollView style={styles.logBox} nestedScrollEnabled>
            {logs.map((log, i) => (
              <Text key={i} style={styles.logText}>
                [{log.time}] {log.msg}
              </Text>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0d0d1f',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  smallBtn: {
    backgroundColor: '#00ff88',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
  },
  smallBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#aaa',
    fontSize: 14,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    backgroundColor: '#2a2a4a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  btnStart: {
    backgroundColor: '#0077ff',
  },
  btnStop: {
    backgroundColor: '#ff4444',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  detectingBadge: {
    marginTop: 10,
    backgroundColor: '#441111',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  detectingText: {
    color: '#ff6666',
    fontWeight: 'bold',
  },
  motionInfo: {
    marginTop: 10,
    backgroundColor: '#0d0d1f',
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 13,
    marginVertical: 2,
  },
  logBox: {
    backgroundColor: '#0d0d1f',
    borderRadius: 8,
    padding: 10,
    maxHeight: 180,
  },
  logText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
