/**
 * VenueDetailBlueprint — compile-time reference for the future full venue page.
 *
 * This component is NOT rendered in production routes. It exists as a skeleton
 * showing section order, spacing, and placeholder behavior for the post-messaging
 * venue redesign.
 *
 * Planned additions (defer to after messaging slices):
 * - Map hero section (react-native-maps / MapView)
 * - Swipeable photo gallery via Google Places Photo API
 * - Friend score aggregation (join friendships + ratings)
 * - Deep link sharing (universal links + app links)
 * - Drink pricing / happy hour section
 */

import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { COLORS } from '../lib/constants';

// Placeholder sections — replace with real components in future slices.
function PlaceholderSection({ title, children, note }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {note && <Text style={styles.sectionNote}>{note}</Text>}
    </View>
  );
}

export default function VenueDetailBlueprint() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* 1. Photo Gallery Hero */}
      <PlaceholderSection
        title="📸 Photo Gallery Hero"
        note="Swipeable carousel using Google Places Photo API. Fallback to deterministic gradient + cohort icon when no photos available."
      >
        <View style={[styles.heroPlaceholder, { backgroundColor: COLORS.bgElevated }]}>
          <Text style={styles.placeholderText}>Photo gallery placeholder</Text>
        </View>
      </PlaceholderSection>

      {/* 2. Map Section */}
      <PlaceholderSection
        title="🗺️ Map"
        note="react-native-maps MapView with venue pin. Tap opens native maps app. Supports distance-based discovery instead of city-only filtering."
      >
        <View style={[styles.mapPlaceholder, { backgroundColor: COLORS.bgCard }]}>
          <Text style={styles.placeholderText}>Map placeholder</Text>
        </View>
      </PlaceholderSection>

      {/* 3. Action Buttons */}
      <PlaceholderSection
        title="🔗 Actions"
        note="Website, Call, Directions. Already implemented in slice 7."
      >
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn}><Text>Website</Text></Pressable>
          <Pressable style={styles.actionBtn}><Text>Call</Text></Pressable>
          <Pressable style={styles.actionBtn}><Text>Directions</Text></Pressable>
        </View>
      </PlaceholderSection>

      {/* 4. Scores */}
      <PlaceholderSection
        title="⭐ Scores"
        note="Your personal rank, friend score, and average score. Friend score requires cross-collection join."
      >
        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Your Rank</Text>
            <Text style={styles.scoreValue}>#1</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Friend Score</Text>
            <Text style={styles.scoreValue}>—</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Average</Text>
            <Text style={styles.scoreValue}>85%</Text>
          </View>
        </View>
      </PlaceholderSection>

      {/* 5. Popular Posts */}
      <PlaceholderSection
        title="🔥 Popular Posts"
        note="Already implemented in slice 7. Shows recent public Ratings for this venue."
      />

      {/* 6. Drink Pricing / Happy Hour */}
      <PlaceholderSection
        title="🍺 Drink Menu & Deals"
        note="Future: crowdsourced drink pricing by category (beer/wine/liquor). Highlight happy hours and promotions."
      >
        <View style={styles.pricingPlaceholder}>
          <Text style={styles.placeholderText}>Pricing data placeholder</Text>
        </View>
      </PlaceholderSection>

      {/* 7. Deep Link Sharing */}
      <PlaceholderSection
        title="📤 Share"
        note="Future: native share sheet with deep link that opens app directly. Fallback to web preview for non-users."
      >
        <Pressable style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share venue link</Text>
        </Pressable>
      </PlaceholderSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sectionNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 6, lineHeight: 16 },
  heroPlaceholder: {
    height: 220,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  scoreValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  pricingPlaceholder: {
    height: 100,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: COLORS.hero,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  placeholderText: { color: COLORS.textPlaceholder, fontSize: 14 },
});
