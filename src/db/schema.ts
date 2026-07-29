import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (maps Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Songs / Created Tracks table
export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  songId: text('song_id').notNull().unique(), // Custom client or provider song ID
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album').default('Qamuz Studio'),
  genre: text('genre').notNull(),
  bpm: integer('bpm').default(120),
  key: text('key').default('C minor'),
  lyrics: jsonb('lyrics'), // Array of { time, text }
  fullLyricsText: text('full_lyrics_text'),
  coverUrl: text('cover_url'),
  audioUrl: text('audio_url').notNull(),
  synthData: jsonb('synth_data'),
  duration: integer('duration').default(180),
  playsCount: integer('plays_count').default(0),
  likesCount: integer('likes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Favorites table
export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  songId: integer('song_id').references(() => songs.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Table relationships
export const usersRelations = relations(users, ({ many }) => ({
  songs: many(songs),
  favorites: many(favorites),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  author: one(users, {
    fields: [songs.userId],
    references: [users.id],
  }),
  favorites: many(favorites),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  song: one(songs, {
    fields: [favorites.songId],
    references: [songs.id],
  }),
}));
