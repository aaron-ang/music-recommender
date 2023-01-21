import { ActivityIndicator, Button, StyleSheet } from "react-native";
import { useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import axios from "axios";

import EditScreenInfo from "../components/EditScreenInfo";
import { Text, View } from "../components/Themed";
import { RootTabScreenProps } from "../types";
import {
  SHAZAM_API_KEY,
  SHAZAM_API_HOST,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} from "@env";

const customRecordingOptions: Audio.RecordingOptions = {
  android: {
    extension: ".3gp",
    outputFormat: Audio.AndroidOutputFormat.THREE_GPP,
    audioEncoder: Audio.AndroidAudioEncoder.AMR_NB,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".caf",
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

export default function TabOneScreen({
  navigation,
}: RootTabScreenProps<"TabOne">) {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [processing, setProcessing] = useState(false);

  const startRecording = async () => {
    try {
      console.log("Requesting permissions..");
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
    console.log("Recording stopped and stored at", uri);
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
      // console.log(response.data.track.title);
    } catch (err) {
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
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
      <EditScreenInfo path="/screens/TabOneScreen.tsx" />
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
