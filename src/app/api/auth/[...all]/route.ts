import { getAuth } from '../../../../lib/auth';
import { NextRequest } from 'next/server';

export const GET = async (req: NextRequest) => {
  const auth = await getAuth();
  return auth.handler(req);
};

export const POST = async (req: NextRequest) => {
  const auth = await getAuth();
  return auth.handler(req);
};
