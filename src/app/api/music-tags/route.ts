import { NextResponse } from 'next/server';
import { settingsStore } from '@/src/lib/server/settings-store';

export async function GET(request: Request) {
  try {
    const musicTags = await settingsStore.getSetting('musicTags');
    
    if (!musicTags) {
      return NextResponse.json({ genres: [], tags: [], lastUpdated: null });
    }

    return NextResponse.json(musicTags);
  } catch (error) {
    console.error('Fetch music tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
