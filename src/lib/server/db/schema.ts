import {
	boolean,
	timestamp,
	pgTable,
	text,
	unique,
	primaryKey,
	integer,
	json,
	index,
	real,
} from "drizzle-orm/pg-core"
import { randomUUID } from 'crypto';

// Note: db is exported from index.ts to avoid SvelteKit env issues with drizzle-kit

export const users = pgTable("user", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	name: text("name"),
	email: text("email").unique(),
	emailVerifiedBool: boolean("emailVerifiedBool").notNull().default(false),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	password: text('password'),
	image: text("image"),
	isAdmin: boolean("isAdmin").notNull().default(false),
	stripeCustomerId: text("stripeCustomerId"),
	subscriptionStatus: text("subscriptionStatus", { 
		enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid"] 
	}).default("incomplete"),
	planTier: text("planTier", { 
		enum: ["free", "starter", "pro", "advanced"] 
	}).default("free"),
	marketingConsent: boolean("marketingConsent").notNull().default(false),
	professionalRole: text("professionalRole", {
		enum: ["artist", "producer", "musician", "label", "none"]
	}),
	portfolioUrl: text("portfolioUrl"),
	creditsBalance: integer("creditsBalance").notNull().default(0),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const passwordResetTokens = pgTable(
	"passwordResetToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: timestamp("expires", { mode: "date" }).notNull(),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	},
	(passwordResetToken) => [
		{
			compositePk: primaryKey({
				columns: [passwordResetToken.identifier, passwordResetToken.token],
			}),
		},
	]
)

export const betterAuthAccounts = pgTable(
	"betterAuthAccount",
	{
		id: text("id")
			.primaryKey().notNull()
			.$defaultFn(() => randomUUID()),
		accountId: text("accountId").notNull(),
		providerId: text("providerId").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("accessToken"),
		refreshToken: text("refreshToken"),
		idToken: text("idToken"),
		accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
		refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
	},
	(table) => [
		unique("better_auth_account_provider_account_unique").on(table.accountId, table.providerId),
		index("better_auth_account_user_idx").on(table.userId),
	]
)

export const betterAuthSessions = pgTable(
	"betterAuthSession",
	{
		id: text("id")
			.primaryKey().notNull()
			.$defaultFn(() => randomUUID()),
		expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("better_auth_session_user_idx").on(table.userId),
	]
)

export const betterAuthVerifications = pgTable(
	"betterAuthVerification",
	{
		id: text("id")
			.primaryKey().notNull()
			.$defaultFn(() => randomUUID()),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
	},
	(table) => [
		index("better_auth_verification_identifier_idx").on(table.identifier),
	]
)

export const images = pgTable("image", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - images may not always be associated with a specific chat
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	// Generation metadata (nullable for backward compatibility)
	prompt: text("prompt"), // Generation prompt
	model: text("model"), // Model name (e.g., "flux-schnell")
	aspectRatio: text("aspectRatio"), // e.g., "1:1", "16:9"
	seed: integer("seed"), // Random seed for reproducibility
	quality: text("quality"), // Quality setting (model-specific)
	style: text("style"), // Style setting (model-specific)
	numberOfImages: integer("numberOfImages"), // Number of images generated
	referenceImageUrl: text("referenceImageUrl"), // i2i reference image URL
	upscaleFactor: text("upscaleFactor"), // Upscale factor (e.g., "x2", "x4") - Google Upscaler
	compressionQuality: integer("compressionQuality"), // Compression quality (1-100) - Google Upscaler
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	// Reduces query time on Neon serverless from 100-200ms to 10-50ms
	index('images_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('images_storage_location_idx').on(table.storageLocation),
])

export const videos = pgTable("video", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - videos may not always be associated with a specific chat
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	duration: integer("duration"), // Video duration in seconds (8 for Veo 3)
	resolution: text("resolution"), // e.g., "720p"
	fps: integer("fps"), // Frames per second (24 for Veo 3)
	hasAudio: boolean("hasAudio").notNull().default(true), // Veo 3 generates audio natively
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	// Generation metadata (nullable for backward compatibility)
	prompt: text("prompt"), // Generation prompt
	model: text("model"), // Model name (e.g., "ray-flash-2-720p")
	aspectRatio: text("aspectRatio"), // e.g., "16:9"
	seed: integer("seed"), // Random seed for reproducibility
	quality: text("quality"), // Quality setting (model-specific)
	style: text("style"), // Style setting (model-specific)
	imageStartUrl: text("imageStartUrl"), // i2v start frame URL
	imageEndUrl: text("imageEndUrl"), // i2v end frame URL
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	// Reduces query time on Neon serverless from 100-200ms to 10-50ms
	index('videos_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('videos_storage_location_idx').on(table.storageLocation),
])

export const audio = pgTable("audio", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - audio may not always be associated with a specific chat
	messageIndex: integer("messageIndex"), // Index of message in chat (for Read Aloud caching)
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	duration: integer("duration"), // Audio duration in seconds (estimated from text length)
	text: text("text").notNull(), // The original text that was converted to speech
	model: text("model").notNull(), // TTS model used (e.g., "eleven_multilingual_v2")
	voiceId: text("voiceId").notNull(), // Voice ID used for generation
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	index('audio_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('audio_storage_location_idx').on(table.storageLocation),
	// Composite index for Read Aloud cache lookups (userId, chatId, messageIndex)
	// Enables O(1) cache hit queries instead of O(n) full table scans
	index('audio_cache_lookup_idx').on(table.userId, table.chatId, table.messageIndex),
])

export const transcriptions = pgTable("transcriptions", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - transcription may not always be associated with a specific chat
	mimeType: text("mimeType").notNull(), // Original audio MIME type
	fileSize: integer("fileSize").notNull(), // Original audio file size
	duration: integer("duration"), // Audio duration in seconds
	text: text("text").notNull(), // Full transcribed text
	words: json("words").$type<Array<{ text: string; start: number; end: number }>>(), // Word-level timestamps for highlighting
	model: text("model").notNull(), // STT model used (e.g., "scribe_v1")
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	index('transcriptions_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('transcriptions_storage_location_idx').on(table.storageLocation),
])

export const voiceChanges = pgTable("voice_changes", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	// Output audio info (the transformed/converted audio)
	filename: text("filename").notNull(),
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage
	// Original audio info (for before/after comparison)
	originalFilename: text("originalFilename").notNull(),
	originalMimeType: text("originalMimeType").notNull(),
	originalFileSize: integer("originalFileSize").notNull(),
	originalStorageLocation: text("originalStorageLocation").notNull().default("local"),
	originalCloudPath: text("originalCloudPath"),
	// Metadata
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - voice change may not always be associated with a specific chat
	duration: integer("duration"), // Audio duration in seconds
	targetVoiceId: text("targetVoiceId").notNull(), // Voice ID used for conversion
	model: text("model").notNull(), // STS model used (e.g., "eleven_multilingual_sts_v2")
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	index('voice_changes_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('voice_changes_storage_location_idx').on(table.storageLocation),
])

export const music = pgTable("music", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - music may not always be associated with a specific chat
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	durationMs: integer("durationMs"), // Music duration in milliseconds
	prompt: text("prompt").notNull(), // The prompt used to generate music
	title: text("title"), // The title of the song, can be edited by user
	genre: text("genre"), // Optional genre label for discovery
	tags: json("tags").$type<string[]>().notNull().default([]), // Search/discovery tags
	isPublic: boolean("isPublic").notNull().default(false), // Whether the song is published to the home feed
	likesCount: integer("likesCount").notNull().default(0), // Number of likes
	playsCount: integer("playsCount").notNull().default(0), // Number of plays
	model: text("model").notNull(), // Music model used (e.g., "music_v1")
	isInstrumental: boolean("isInstrumental").notNull().default(false), // Whether music is instrumental only
	imageUrl: text("imageUrl"), // Cover art URL
	videoUrl: text("videoUrl"), // Video URL
	lyrics: text("lyrics"), // Lyrics text
	/** Karaoke-accurate line timings from provider alignment (seconds). */
	alignedLyrics: json("alignedLyrics").$type<
		Array<{ text: string; start: number; end?: number; section?: string }>
	>(),
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	index('music_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('music_storage_location_idx').on(table.storageLocation),
])

export const musicLikes = pgTable("music_like", {
	id: text("id")
		.primaryKey()
		.notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	musicId: text("musicId")
		.notNull()
		.references(() => music.id, { onDelete: "cascade" }),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	unique("music_like_user_track_unique").on(table.userId, table.musicId),
	index("music_likes_user_idx").on(table.userId),
	index("music_likes_music_idx").on(table.musicId),
]);

export const soundEffects = pgTable("sound_effects", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	chatId: text("chatId"), // Optional - sound effects may not always be associated with a specific chat
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(),
	durationSeconds: real("durationSeconds"), // Sound effect duration in seconds
	text: text("text").notNull(), // The description used to generate the sound effect
	promptInfluence: real("promptInfluence"), // 0.0-1.0, how literally the prompt was interpreted
	model: text("model").notNull(), // Sound effect model used (e.g., "sound_effects_v1")
	storageLocation: text("storageLocation").notNull().default("local"), // 'local' | 'r2'
	cloudPath: text("cloudPath"), // Path/key for cloud storage (null for local files)
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite index for library queries (order by createdAt DESC for user)
	index('sound_effects_user_created_idx').on(table.userId, table.createdAt),
	// Index for filtering by storage location (R2 vs local)
	index('sound_effects_storage_location_idx').on(table.storageLocation),
])

export const projects = pgTable("project", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	customInstructions: text("customInstructions"), // System prompt for this project
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('projects_user_created_idx').on(table.userId, table.createdAt),
])

export const projectFiles = pgTable("project_file", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	projectId: text("projectId")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	filename: text("filename").notNull(),
	mimeType: text("mimeType").notNull(),
	fileSize: integer("fileSize").notNull(), // bytes
	content: text("content").notNull(), // text content stored directly in DB
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('project_files_project_idx').on(table.projectId),
])

export const chats = pgTable("chat", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	model: text("model").notNull(),
	messages: json("messages").$type<Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
		model?: string;
		imageId?: string; // Reference to images table
		imageUrl?: string; // Deprecated, for backwards compatibility
		imageData?: string; // Deprecated, for backwards compatibility
		videoId?: string; // Reference to videos table
		mimeType?: string;
		type?: 'text' | 'image' | 'video';
	}>>().notNull().default([]),
	pinned: boolean("pinned").notNull().default(false),
	isBranch: boolean("isBranch").notNull().default(false),
	branchAtIndex: integer("branchAtIndex"),
	branchSourceChatId: text("branchSourceChatId"),
	projectId: text("projectId")
		.references(() => projects.id, { onDelete: "set null" }), // Chats preserved if project deleted
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('chats_project_idx').on(table.projectId),
])

export const pricingPlans = pgTable("pricing_plan", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	name: text("name").notNull(),
	tier: text("tier", { 
		enum: ["free", "starter", "pro", "advanced"] 
	}).notNull(),
	stripePriceId: text("stripePriceId").notNull().unique(),
	priceAmount: integer("priceAmount").notNull(), // Price in cents
	currency: text("currency").notNull().default("usd"),
	billingInterval: text("billingInterval", { 
		enum: ["month", "year"] 
	}).notNull().default("month"),
	textGenerationLimit: integer("textGenerationLimit"), // null = unlimited
	imageGenerationLimit: integer("imageGenerationLimit"), // null = unlimited
	videoGenerationLimit: integer("videoGenerationLimit"), // null = unlimited
	audioGenerationLimit: integer("audioGenerationLimit"), // null = unlimited
	features: json("features").$type<string[]>().notNull().default([]),
	isActive: boolean("isActive").notNull().default(true),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const creditPackages = pgTable("credit_package", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	credits: integer("credits").notNull(),
	priceAmount: integer("priceAmount").notNull(), // Price in cents
	currency: text("currency").notNull().default("usd"),
	badgeText: text("badgeText"),
	isActive: boolean("isActive").notNull().default(true),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const subscriptions = pgTable("subscription", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	stripeSubscriptionId: text("stripeSubscriptionId").notNull().unique(),
	stripePriceId: text("stripePriceId").notNull(),
	planTier: text("planTier", { 
		enum: ["free", "starter", "pro", "advanced"] 
	}).notNull(),
	previousPlanTier: text("previousPlanTier", { 
		enum: ["free", "starter", "pro", "advanced"] 
	}), // Track previous plan for plan change analytics
	status: text("status", { 
		enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid"] 
	}).notNull(),
	currentPeriodStart: timestamp("currentPeriodStart", { mode: "date" }).notNull(),
	currentPeriodEnd: timestamp("currentPeriodEnd", { mode: "date" }).notNull(),
	cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
	canceledAt: timestamp("canceledAt", { mode: "date" }),
	endedAt: timestamp("endedAt", { mode: "date" }),
	planChangedAt: timestamp("planChangedAt", { mode: "date" }), // Track when plan was last changed
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const usageTracking = pgTable("usage_tracking", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	month: integer("month").notNull(), // 1-12
	year: integer("year").notNull(),
	textGenerationCount: integer("textGenerationCount").notNull().default(0),
	imageGenerationCount: integer("imageGenerationCount").notNull().default(0),
	videoGenerationCount: integer("videoGenerationCount").notNull().default(0),
	audioGenerationCount: integer("audioGenerationCount").notNull().default(0),
	lastResetAt: timestamp("lastResetAt", { mode: "date" }).notNull().defaultNow(),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	unique('user_month_year_unique').on(table.userId, table.month, table.year),
])

export const paymentHistory = pgTable("payment_history", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.references(() => users.id, { onDelete: "set null" }), // Keep payment records for audit/legal purposes
	stripePaymentIntentId: text("stripePaymentIntentId"),
	stripeInvoiceId: text("stripeInvoiceId"),
	subscriptionId: text("subscriptionId")
		.references(() => subscriptions.id, { onDelete: "set null" }),
	amount: integer("amount").notNull(), // Amount in cents
	currency: text("currency").notNull().default("usd"),
	status: text("status", { 
		enum: ["succeeded", "pending", "failed", "canceled", "refunded"] 
	}).notNull(),
	description: text("description"),
	paymentMethodType: text("paymentMethodType"), // card, bank_transfer, etc.
	last4: text("last4"), // Last 4 digits of payment method
	brand: text("brand"), // visa, mastercard, etc.
	paidAt: timestamp("paidAt", { mode: "date" }),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const adminSettings = pgTable("admin_settings", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	key: text("key").notNull().unique(), // Setting key (e.g., 'site_name', 'stripe_public_key')
	value: text("value"), // Setting value (JSON for complex values)
	category: text("category").notNull(), // 'general', 'branding', 'payment', 'oauth'
	encrypted: boolean("encrypted").notNull().default(false), // Whether value is encrypted
	description: text("description"), // Human-readable description
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('admin_settings_category_idx').on(table.category),
])

export const favoriteModels = pgTable("favorite_model", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	modelName: text("modelName").notNull(),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	// Composite unique constraint: user can only favorite a model once
	unique('user_model_unique').on(table.userId, table.modelName),
	// Index for fast lookup of user's favorites
	index('favorite_models_user_idx').on(table.userId),
])

export const adminFiles = pgTable("admin_files", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	filename: text("filename").notNull(),
	originalName: text("originalName").notNull(),
	mimeType: text("mimeType").notNull(),
	size: integer("size").notNull(), // File size in bytes
	category: text("category").notNull(), // 'logo', 'favicon', etc.
	path: text("path").notNull(), // File storage path
	url: text("url"), // Public URL if applicable
	storageLocation: text("storage_location").notNull().default('local'), // 'local' or 'r2'
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('admin_files_category_idx').on(table.category),
])

export const auditLogs = pgTable("audit_log", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.references(() => users.id, { onDelete: "cascade" }),
	action: text("action").notNull(), // e.g. "accepted_terms", "generation_blocked"
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	details: json("details"), // JSON payload with exact checkboxes ticked or block reason
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('audit_logs_user_idx').on(table.userId),
	index('audit_logs_action_idx').on(table.action),
])

// --- NEW TABLES FOR ADVANCED ARCHITECTURE ---

export const creditTransactions = pgTable("credit_transactions", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["hold", "commit", "rollback", "recharge"] }).notNull(),
	amount: integer("amount").notNull(), // Negative for deduction, positive for addition/refund
	resourceType: text("resourceType").notNull(), // 'text', 'image', 'video', 'audio', 'credit'
	provider: text("provider"), // e.g., 'replicate', 'openrouter', 'suno'
	model: text("model"), // Specific model name
	status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
	errorMessage: text("errorMessage"), // Stores error message if failed
	referenceId: text("referenceId"), // ID to link hold, commit, and rollback transactions
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('credit_txn_user_idx').on(table.userId),
	index('credit_txn_ref_idx').on(table.referenceId),
	index('credit_txn_status_idx').on(table.status),
])

export const aiJobs = pgTable("ai_jobs", {
	id: text("id")
		.primaryKey().notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // e.g., 'music-generation', 'video-generation'
	payload: json("payload").notNull(), // The parameters required to execute the job
	priority: integer("priority").notNull().default(10), // Lower number = higher priority (1 = Pro, 10 = Free)
	status: text("status", { enum: ["queued", "processing", "completed", "failed"] }).notNull().default("queued"),
	result: json("result"), // The successful response from the AI provider
	errorMessage: text("errorMessage"), // Error details if failed
	attempts: integer("attempts").notNull().default(0), // Number of retries
	transactionId: text("transactionId"), // Link to the 'hold' transaction to commit/rollback later
	startedAt: timestamp("startedAt", { mode: "date" }),
	completedAt: timestamp("completedAt", { mode: "date" }),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('ai_jobs_status_priority_idx').on(table.status, table.priority), // Critical for efficient queue fetching
	index('ai_jobs_user_idx').on(table.userId),
])

// Public artist page (stage name, bio, avatar, banner). This id is the public URL.
export const artistProfiles = pgTable("artist_profile", {
	id: text("id")
		.primaryKey()
		.notNull()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	stageName: text("stageName"),
	bio: text("bio"),
	avatarUrl: text("avatarUrl"),
	bannerUrl: text("bannerUrl"),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index('artist_profiles_user_idx').on(table.userId),
]);

// Verification tokens / verifiedAt keyed by userId. Not the public URL id.
export const artists = pgTable("artist", {
  id: text("id").primaryKey().notNull().$defaultFn(() => randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
	verificationEmail: text("verificationEmail"),
	verificationToken: text("verificationToken"),
	verificationTokenExpiresAt: timestamp("verificationTokenExpiresAt", { mode: "date" }),
	verificationRequestedAt: timestamp("verificationRequestedAt", { mode: "date" }),
  verifiedAt: timestamp("verifiedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("artist_user_idx").on(table.userId),
	index("artist_verification_token_idx").on(table.verificationToken),
]);

export const follows = pgTable("follow", {
	id: text("id")
		.primaryKey()
		.notNull()
		.$defaultFn(() => randomUUID()),
	followerId: text("followerId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	followingId: text("followingId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	unique('follow_pair_unique').on(table.followerId, table.followingId),
	index('follows_follower_idx').on(table.followerId),
	index('follows_following_idx').on(table.followingId),
]);

// Playlists table
export const playlists = pgTable("playlist", {
  id: text("id").primaryKey().notNull().$defaultFn(() => randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("playlist_user_idx").on(table.userId),
]);

// Playlist items
export const playlistItems = pgTable("playlist_item", {
  id: text("id").primaryKey().notNull().$defaultFn(() => randomUUID()),
  playlistId: text("playlistId").notNull().references(() => playlists.id, { onDelete: "cascade" }),
  musicId: text("musicId").notNull().references(() => music.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("playlist_item_playlist_idx").on(table.playlistId),
  index("playlist_item_music_idx").on(table.musicId),
  unique("playlist_item_music_unique").on(table.playlistId, table.musicId),
]);

export const masterJobs = pgTable("master_job", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	sourceName: text("sourceName"),
	sourceKind: text("sourceKind").notNull().default("upload"),
	sourceMusicId: text("sourceMusicId"),
	style: text("style"),
	recipe: json("recipe"),
	peakDb: real("peakDb"),
	lufs: real("lufs"),
	durationSec: real("durationSec"),
	mimeType: text("mimeType").notNull().default("audio/wav"),
	fileSize: integer("fileSize").notNull().default(0),
	storageLocation: text("storageLocation").notNull().default("local"),
	cloudPath: text("cloudPath"),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	index("master_job_user_created_idx").on(table.userId, table.createdAt),
]);

export const dawSessions = pgTable("daw_session", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	idea: text("idea"),
	stage: text("stage"),
	title: text("title"),
	audioUrl: text("audioUrl"),
	mixNotes: text("mixNotes"),
	snapshot: json("snapshot"),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
	unique("daw_session_user_name_unique").on(table.userId, table.name),
	index("daw_session_user_updated_idx").on(table.userId, table.updatedAt),
]);
