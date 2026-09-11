import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { users } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";

export const load: PageServerLoad = async ({ params, locals }) => {
  const musicId = params.id?.trim();
  if (!musicId) throw error(404, "Track not found");

  const session = await locals.auth();
  let isKaraokeUnlimited = false;

  if (session?.user?.id) {
    const [user] = await db
      .select({
        isAdmin: users.isAdmin,
        userType: users.userType,
        isVerifiedArtist: users.isVerifiedArtist,
        hasUnlimitedFanAccess: users.hasUnlimitedFanAccess,
        planTier: users.planTier
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user) {
      // Artists, producers, admins, or paid fan/unlimited tiers have full access
      if (
        user.isAdmin ||
        user.isVerifiedArtist ||
        user.userType === "artist" ||
        user.userType === "producer" ||
        user.hasUnlimitedFanAccess ||
        (user.planTier && user.planTier !== "free")
      ) {
        isKaraokeUnlimited = true;
      }
    }
  }

  return {
    musicId,
    isKaraokeUnlimited
  };
};
