CREATE TABLE "admin_files" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"originalName" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" integer NOT NULL,
	"category" text NOT NULL,
	"path" text NOT NULL,
	"url" text,
	"storage_location" text DEFAULT 'local' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"category" text NOT NULL,
	"encrypted" boolean DEFAULT false NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "artist_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"displayName" text,
	"bio" text,
	"bannerUrl" text,
	"genres" json DEFAULT '[]'::json NOT NULL,
	"socialLinks" json DEFAULT '{}'::json NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_profile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "audio" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"messageIndex" integer,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"duration" integer,
	"text" text NOT NULL,
	"model" text NOT NULL,
	"voiceId" text NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betterAuthAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "better_auth_account_provider_account_unique" UNIQUE("accountId","providerId")
);
--> statement-breakpoint
CREATE TABLE "betterAuthSession" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "betterAuthSession_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "betterAuthVerification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"model" text NOT NULL,
	"messages" json DEFAULT '[]'::json NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"isBranch" boolean DEFAULT false NOT NULL,
	"branchAtIndex" integer,
	"branchSourceChatId" text,
	"projectId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creditPackage" (
	"id" text PRIMARY KEY NOT NULL,
	"stripePriceId" text NOT NULL,
	"priceAmount" integer NOT NULL,
	"credits" integer NOT NULL,
	"oldCredits" integer,
	"badgeText" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_model" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"modelName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_model_unique" UNIQUE("userId","modelName")
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"id" text PRIMARY KEY NOT NULL,
	"followerId" text NOT NULL,
	"followingId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follow_pair_unique" UNIQUE("followerId","followingId")
);
--> statement-breakpoint
CREATE TABLE "image" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"prompt" text,
	"model" text,
	"aspectRatio" text,
	"seed" integer,
	"quality" text,
	"style" text,
	"numberOfImages" integer,
	"referenceImageUrl" text,
	"upscaleFactor" text,
	"compressionQuality" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "like" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicationId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "like_user_pub_unique" UNIQUE("userId","publicationId")
);
--> statement-breakpoint
CREATE TABLE "listening_history" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicationId" text NOT NULL,
	"playedAt" timestamp DEFAULT now() NOT NULL,
	"playDurationMs" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"durationMs" integer,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"isInstrumental" boolean DEFAULT false NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"coverUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passwordResetToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"stripePaymentIntentId" text,
	"stripeInvoiceId" text,
	"subscriptionId" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"description" text,
	"paymentMethodType" text,
	"last4" text,
	"brand" text,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_item" (
	"id" text PRIMARY KEY NOT NULL,
	"playlistId" text NOT NULL,
	"publicationId" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_item_unique" UNIQUE("playlistId","publicationId")
);
--> statement-breakpoint
CREATE TABLE "playlist" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"coverUrl" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"trackCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"stripePriceId" text NOT NULL,
	"priceAmount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"billingInterval" text DEFAULT 'month' NOT NULL,
	"creditLimit" integer,
	"textGenerationLimit" integer,
	"imageGenerationLimit" integer,
	"videoGenerationLimit" integer,
	"audioGenerationLimit" integer,
	"features" json DEFAULT '[]'::json NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_plan_stripePriceId_unique" UNIQUE("stripePriceId")
);
--> statement-breakpoint
CREATE TABLE "project_file" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"customInstructions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"prompt" text,
	"audioUrl" text,
	"videoUrl" text,
	"coverUrl" text,
	"lyrics" json,
	"tags" text,
	"model" text,
	"durationMs" integer,
	"isInstrumental" boolean DEFAULT false NOT NULL,
	"externalId" text,
	"musicId" text,
	"videoId" text,
	"imageId" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"playCount" integer DEFAULT 0 NOT NULL,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"platform" text NOT NULL,
	"platformUserId" text NOT NULL,
	"platformUsername" text,
	"platformAvatar" text,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"tokenExpiresAt" timestamp,
	"scope" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_account_user_platform_unique" UNIQUE("userId","platform")
);
--> statement-breakpoint
CREATE TABLE "sound_effects" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"durationSeconds" real,
	"text" text NOT NULL,
	"promptInfluence" real,
	"model" text NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"stripeSubscriptionId" text NOT NULL,
	"stripePriceId" text NOT NULL,
	"planTier" text NOT NULL,
	"previousPlanTier" text,
	"status" text NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"canceledAt" timestamp,
	"endedAt" timestamp,
	"planChangedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"duration" integer,
	"text" text NOT NULL,
	"words" json,
	"model" text NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"creditsUsed" integer DEFAULT 0 NOT NULL,
	"lastResetAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_month_year_unique" UNIQUE("userId","month","year")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerifiedBool" boolean DEFAULT false NOT NULL,
	"emailVerified" timestamp,
	"password" text,
	"image" text,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"stripeCustomerId" text,
	"subscriptionStatus" text DEFAULT 'incomplete',
	"planTier" text DEFAULT 'free',
	"autoTopupEnabled" boolean DEFAULT false NOT NULL,
	"autoTopupAmount" integer,
	"autoTopupCredits" integer,
	"creditBalance" integer DEFAULT 0,
	"marketingConsent" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_project" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicationId" text,
	"title" text NOT NULL,
	"audioUrl" text,
	"coverUrl" text,
	"lyrics" text,
	"style" text,
	"prompt" text,
	"config" json,
	"status" text DEFAULT 'script' NOT NULL,
	"script" json,
	"scenes" json,
	"clips" json,
	"finalVideoUrl" text,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"userId" text NOT NULL,
	"chatId" text,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"duration" integer,
	"resolution" text,
	"fps" integer,
	"hasAudio" boolean DEFAULT true NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"prompt" text,
	"model" text,
	"aspectRatio" text,
	"seed" integer,
	"quality" text,
	"style" text,
	"imageStartUrl" text,
	"imageEndUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"storageLocation" text DEFAULT 'local' NOT NULL,
	"cloudPath" text,
	"originalFilename" text NOT NULL,
	"originalMimeType" text NOT NULL,
	"originalFileSize" integer NOT NULL,
	"originalStorageLocation" text DEFAULT 'local' NOT NULL,
	"originalCloudPath" text,
	"userId" text NOT NULL,
	"chatId" text,
	"duration" integer,
	"targetVoiceId" text NOT NULL,
	"model" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_profile" ADD CONSTRAINT "artist_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio" ADD CONSTRAINT "audio_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betterAuthAccount" ADD CONSTRAINT "betterAuthAccount_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betterAuthSession" ADD CONSTRAINT "betterAuthSession_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_model" ADD CONSTRAINT "favorite_model_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followerId_user_id_fk" FOREIGN KEY ("followerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followingId_user_id_fk" FOREIGN KEY ("followingId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like" ADD CONSTRAINT "like_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like" ADD CONSTRAINT "like_publicationId_publication_id_fk" FOREIGN KEY ("publicationId") REFERENCES "public"."publication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_publicationId_publication_id_fk" FOREIGN KEY ("publicationId") REFERENCES "public"."publication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music" ADD CONSTRAINT "music_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_subscriptionId_subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_item" ADD CONSTRAINT "playlist_item_playlistId_playlist_id_fk" FOREIGN KEY ("playlistId") REFERENCES "public"."playlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_item" ADD CONSTRAINT "playlist_item_publicationId_publication_id_fk" FOREIGN KEY ("publicationId") REFERENCES "public"."publication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_musicId_music_id_fk" FOREIGN KEY ("musicId") REFERENCES "public"."music"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_videoId_video_id_fk" FOREIGN KEY ("videoId") REFERENCES "public"."video"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_imageId_image_id_fk" FOREIGN KEY ("imageId") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_account" ADD CONSTRAINT "social_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_effects" ADD CONSTRAINT "sound_effects_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_project" ADD CONSTRAINT "video_project_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_project" ADD CONSTRAINT "video_project_publicationId_publication_id_fk" FOREIGN KEY ("publicationId") REFERENCES "public"."publication"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_changes" ADD CONSTRAINT "voice_changes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_files_category_idx" ON "admin_files" USING btree ("category");--> statement-breakpoint
CREATE INDEX "admin_settings_category_idx" ON "admin_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "artist_profiles_user_idx" ON "artist_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "audio_user_created_idx" ON "audio" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "audio_storage_location_idx" ON "audio" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "audio_cache_lookup_idx" ON "audio" USING btree ("userId","chatId","messageIndex");--> statement-breakpoint
CREATE INDEX "better_auth_account_user_idx" ON "betterAuthAccount" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "better_auth_session_user_idx" ON "betterAuthSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "better_auth_verification_identifier_idx" ON "betterAuthVerification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "chats_project_idx" ON "chat" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "favorite_models_user_idx" ON "favorite_model" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "follows_follower_idx" ON "follow" USING btree ("followerId");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follow" USING btree ("followingId");--> statement-breakpoint
CREATE INDEX "images_user_created_idx" ON "image" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "images_storage_location_idx" ON "image" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "likes_publication_idx" ON "like" USING btree ("publicationId");--> statement-breakpoint
CREATE INDEX "likes_user_idx" ON "like" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "listening_history_user_idx" ON "listening_history" USING btree ("userId","playedAt");--> statement-breakpoint
CREATE INDEX "listening_history_pub_idx" ON "listening_history" USING btree ("publicationId");--> statement-breakpoint
CREATE INDEX "music_user_created_idx" ON "music" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "music_storage_location_idx" ON "music" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "playlist_items_playlist_order_idx" ON "playlist_item" USING btree ("playlistId","sortOrder");--> statement-breakpoint
CREATE INDEX "playlists_user_idx" ON "playlist" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "project_files_project_idx" ON "project_file" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "projects_user_created_idx" ON "project" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "publications_user_created_idx" ON "publication" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "publications_public_plays_idx" ON "publication" USING btree ("isPublic","playCount");--> statement-breakpoint
CREATE INDEX "publications_type_idx" ON "publication" USING btree ("type");--> statement-breakpoint
CREATE INDEX "social_account_user_idx" ON "social_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sound_effects_user_created_idx" ON "sound_effects" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "sound_effects_storage_location_idx" ON "sound_effects" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "transcriptions_user_created_idx" ON "transcriptions" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "transcriptions_storage_location_idx" ON "transcriptions" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "video_projects_user_idx" ON "video_project" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "videos_user_created_idx" ON "video" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "videos_storage_location_idx" ON "video" USING btree ("storageLocation");--> statement-breakpoint
CREATE INDEX "voice_changes_user_created_idx" ON "voice_changes" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "voice_changes_storage_location_idx" ON "voice_changes" USING btree ("storageLocation");