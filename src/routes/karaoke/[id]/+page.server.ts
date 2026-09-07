import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
  const musicId = params.id?.trim();
  if (!musicId) throw error(404, "Track not found");
  return { musicId };
};
