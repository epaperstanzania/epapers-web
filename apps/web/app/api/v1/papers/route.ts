export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { uploadSchemas as schemas } from '@epapers/server/modules/uploads/schemas';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/uploads/service';
import * as catalog from '@epapers/server/modules/catalog/service';
export const OPTIONS = preflight;
export const GET = route('papers', catalogSchemas.papers, async (data, _request, _identity) => catalog.papers(data), false, true);
export const POST = route('papers', schemas.create, async (data, _request, identity) => service.createPaper(identity!.user, data), true, false);
