export const runtime = 'nodejs';
import { z } from 'zod';
import { route } from '@/lib/routes-helpers';
import * as service from '@epapers/server/modules/moderation/service';

export const GET = route('paper-requests/suggestions', z.strictObject({}), async (_data, _request, identity) => service.paperRequestSuggestions(identity!.user), true, false);
