import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import RecordingDetailScreen from './src/screens/RecordingDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useStore } from './src/store';
import { COLORS } from './src/utils/constants';

type Screen =
  | { name: 'home' }
  | { name: 'recording' }
  | { name: 'detail'; recordingId: string }
  | { name: 'settings' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const loadFromDisk = useStore((s) => s.loadFromDisk);

  useEffect(() => {
    loadFromDisk();
  }, [loadFromDisk]);

  const renderScreen = () => {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            onStartRecording={() => setScreen({ name: 'recording' })}
            onViewRecording={(id) => setScreen({ name: 'detail', recordingId: id })}
            onOpenSettings={() => setScreen({ name: 'settings' })}
          />
        );
      case 'recording':
        return (
          <RecordingScreen
            onFinish={(id) => setScreen({ name: 'detail', recordingId: id })}
            onCancel={() => setScreen({ name: 'home' })}
          />
        );
      case 'detail':
        return (
          <RecordingDetailScreen
            recordingId={screen.recordingId}
            onBack={() => setScreen({ name: 'home' })}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={() => setScreen({ name: 'home' })} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
