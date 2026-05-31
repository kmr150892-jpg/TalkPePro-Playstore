import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      // @ts-ignore: TS doesn't recognize string as a valid Href type here, but WebBrowser needs it.
      href={props.href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // 🔥 SATTI FIX: Securely prevent default link redirection on mobile nodes.
          e.preventDefault();
          // 🔥 SATTI FIX: Open the secure external resource via an in-app host-grade browser.
          WebBrowser.openBrowserAsync(props.href as string);
        }
      }}
    />
  );
}