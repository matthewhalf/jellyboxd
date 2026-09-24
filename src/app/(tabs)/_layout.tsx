import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor="#ffffff"
      backgroundColor="#14181c"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="series">
        <NativeTabs.Trigger.Label>Serie</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "tv", selected: "tv.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movies">
        <NativeTabs.Trigger.Label>Film</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "film", selected: "film.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Cerca</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
