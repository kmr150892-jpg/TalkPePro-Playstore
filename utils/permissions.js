import { Camera } from 'expo-camera';
import { Alert } from 'react-native';

// TalkPe Pro Secure Hardware Authorization Protocol
export const checkAndRequestCallPermissions = async () => {
  try {
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const micStatus = await Camera.requestMicrophonePermissionsAsync(); // 🔄 Hardware access configuration validated

    if (cameraStatus.status === 'granted' && micStatus.status === 'granted') {
      return true; // Full secure authorization granted successfully
    } else {
      Alert.alert(
        "Authorization Required",
        "To initiate a secure consulting session, camera and microphone access is mandatory.",
        [{ text: "OK" }]
      );
      return false; // Authorization declined by user
    }
  } catch (error) {
    console.error("Secure Authorization Error: ", error);
    return false;
  }
};