import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { useTranslation } from "../../i18n";

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <NativeTabs
      tintColor="#ffffff"
      backgroundColor="#000000"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="series">
        <NativeTabs.Trigger.Label>{t("tabs.series")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "tv", selected: "tv.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movies">
        <NativeTabs.Trigger.Label>{t("tabs.movies")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "film", selected: "film.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>{t("tabs.search")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
