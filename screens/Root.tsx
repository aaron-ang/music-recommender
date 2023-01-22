import { ActivityIndicator, Alert, Button, StyleSheet } from "react-native";
import { useState } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import axios, { AxiosError } from "axios";

import { View } from "../components/Themed";
import { RootStackScreenProps } from "../types";
import { SHAZAM_API_KEY, SHAZAM_API_HOST } from "@env";

const customRecordingOptions: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.THREE_GPP,
    audioEncoder: Audio.AndroidAudioEncoder.AMR_NB,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.MIN,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

export default function Root({ navigation }: RootStackScreenProps<"Root">) {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [processing, setProcessing] = useState(false);

  const startRecording = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        customRecordingOptions
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    console.log("Stopping recording..");
    setRecording(undefined);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording?.getURI();
    // console.log("Recording stopped and stored at", uri);
    await processRecording(uri);
  };

  const processRecording = async (uri: string | null | undefined) => {
    if (!uri) {
      return;
    }

    setProcessing(true);
    const url = "https://shazam.p.rapidapi.com/songs/v2/detect";
    const data = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const config = {
      headers: {
        "content-type": "text/plain",
        "X-RapidAPI-Key": SHAZAM_API_KEY,
        "X-RapidAPI-Host": SHAZAM_API_HOST,
      },
    };

    try {
      const response = await axios.post(url, data, config);
      if (response.data.track) {
        const title = response.data.track.title as string;
        const artist = response.data.track.subtitle as string;
        navigation.navigate("Rec", { title: title, artist: artist });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("No track found", "Please try again");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const e = err as AxiosError;
        const status = e.response?.status;
        if (status == 413) {
          Alert.alert(
            "Recording too long",
            "Please record a shorter audio clip"
          );
        }
      }
      console.error("Failed to process recording", err);
    }
    setProcessing(false);
  };

  return processing ? (
    <View style={[styles.container, styles.horizontal]}>
      <ActivityIndicator size="large" />
    </View>
  ) : (
    <View style={styles.container}>
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
