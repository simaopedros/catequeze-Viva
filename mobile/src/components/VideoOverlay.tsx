import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { colors, fonts } from '../theme';

const REACTIONS = [
  { type: 'AMEM' as const, label: 'Amém', icon: 'heart' as const, testID: 'overlay-amem' },
  { type: 'REZO' as const, label: 'Rezo', icon: 'hands-pray' as const, testID: 'overlay-rezo' },
  { type: 'ALELUIA' as const, label: 'Aleluia', icon: 'sparkles' as const, testID: 'overlay-aleluia' },
];

export function VideoOverlay({
  post,
  following,
  onOpenAuthor,
  onReact,
  onComments,
  onShare,
  onFollow,
}: {
  post: SocialPost;
  following?: boolean;
  onOpenAuthor?: (handle: string) => void;
  onReact?: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComments?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
}) {
  const handle = post.author.handle || post.author.socialHandle;
  const gold = colors.rhemaGold;
  return (
    <View
      testID={`overlay-${post.id}`}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' }}
    >
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: 88,
          alignItems: 'center',
          gap: 14,
          pointerEvents: 'box-none',
        }}
      >
        {REACTIONS.map((item) => {
          const on = post.viewerReaction === item.type;
          const iconName = item.icon === 'hands-pray' ? 'hand-left-outline' : item.icon;
          return (
            <Pressable
              key={item.type}
              testID={item.testID}
              onPress={() => onReact?.(item.type)}
              style={{ alignItems: 'center' }}
            >
              <Ionicons name={iconName} size={28} color={on ? gold : '#fff'} />
              <Text style={{ color: on ? gold : '#fff', fontFamily: fonts.sansSemi, fontSize: 11, marginTop: 2 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable testID="overlay-comments" onPress={onComments} style={{ alignItems: 'center' }}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: fonts.sansSemi, fontSize: 11, marginTop: 2 }}>
            {post.commentCount || 0}
          </Text>
        </Pressable>
        <Pressable testID="overlay-share" onPress={onShare} style={{ alignItems: 'center' }}>
          <Ionicons name="arrow-redo-outline" size={28} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: fonts.sansSemi, fontSize: 11, marginTop: 2 }}>Partilhar</Text>
        </Pressable>
        {!post.isOwn && onFollow ? (
          <Pressable testID="overlay-follow" onPress={onFollow} style={{ alignItems: 'center' }}>
            <Ionicons name={following ? 'checkmark-circle' : 'person-add-outline'} size={28} color={following ? gold : '#fff'} />
            <Text style={{ color: following ? gold : '#fff', fontFamily: fonts.sansSemi, fontSize: 11, marginTop: 2 }}>
              {following ? 'A seguir' : 'Seguir'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ position: 'absolute', left: 16, right: 88, bottom: 72 }}>
        <Pressable
          testID={`overlay-author-${post.id}`}
          onPress={() => handle && onOpenAuthor?.(handle)}
        >
          <Text style={{ color: '#fff', fontFamily: fonts.sansBold, fontSize: 16 }}>
            @{handle || post.author.displayName}
          </Text>
        </Pressable>
        {post.body ? (
          <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: fonts.sans, fontSize: 14, marginTop: 6 }} numberOfLines={3}>
            {post.body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
