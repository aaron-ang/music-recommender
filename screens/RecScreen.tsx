import { ActivityIndicator, Dimensions, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { FlashList } from "@shopify/flash-list";
import { Buffer } from "buffer";
import * as Haptics from "expo-haptics";
import axios from "axios";

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "@env";
import { Text, View } from "../components/Themed";
import { RootStackScreenProps } from "../types";

type RecTrack = {
  name: string;
  artist: string;
};

export default function RecScreen({ route }: RootStackScreenProps<"Rec">) {
  const { title, artist } = route.params;
  const [recs, setRecs] = useState<RecTrack[]>();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    getBearerToken()
      .then((token) => getSongRecs(token))
      .then((recs) => setRecs(recs))
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          console.log(err.response?.data.error);
          console.log(err.response?.data.error_description);
        }
      });
  }, []);

  const getBearerToken = async () => {
    const config = {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString(
            "base64"
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
    const body = { grant_type: "client_credentials" };
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      body,
      config
    );
    const token = response.data.access_token as string;
    return token;
  };

  const getSongRecs = async (token: string) => {
    const songId = await getSongId(token);
    const config = {
      headers: {
        Authorization: "Bearer " + token,
      },
      params: {
        seed_tracks: songId,
        limit: 5,
      },
    };
    const response = await axios.get(
      "https://api.spotify.com/v1/recommendations",
      config
    );
    const recs = response.data.tracks as [];
    const tracks: RecTrack[] = recs.map((rec: any) => ({
      name: rec.name,
      artist: rec.artists[0].name,
    }));
    return tracks;
  };

  const getSongId = async (token: string) => {
    const config = {
      headers: {
        Authorization: "Bearer " + token,
      },
      params: {
        q: `track:${title} artist:${artist}`,
        type: "track",
        limit: 1,
      },
    };
    const response = await axios.get(
      "https://api.spotify.com/v1/search",
      config
    );
    const songId = response.data.tracks.items[0].id as string;
    return songId;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} by {artist}
      </Text>
      <Text style={styles.separator}></Text>
      <Text style={styles.title}>Recommended Songs</Text>
      <View style={[styles.list]}>
        {recs ? (
          <FlashList
            data={recs}
            renderItem={({ item }) => (
              <Text style={styles.item}>
                {item.name} by {item.artist}
              </Text>
            )}
            estimatedItemSize={100}
            refreshing={false}
            onRefresh={() =>
              getBearerToken()
                .then((token) => getSongRecs(token))
                .then((recs) => setRecs(recs))
            }
          />
        ) : (
          <ActivityIndicator />
        )}
      </View>
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
  list: {
    height: Dimensions.get("screen").height * 0.5,
    width: Dimensions.get("screen").width,
  },
  item: {
    height: 50,
    width: Dimensions.get("screen").width,
    backgroundColor: "#1DB954",
  },
});
