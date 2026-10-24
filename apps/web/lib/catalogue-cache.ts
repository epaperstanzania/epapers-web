import 'server-only';
import { unstable_cache } from 'next/cache';
import * as catalogue from '@epapers/server/modules/catalog/service';

// The public pages are request-rendered, but their curriculum reads are shared
// across visitors. Keep papers/search outside this cache because they change
// with moderation and download activity.
export const catalogueStructureTag = 'public-catalogue-structure';
const options = { tags: [catalogueStructureTag], revalidate: 60 };

export const cachedDepartments = unstable_cache(
    catalogue.departments,
    ['public-departments-v1'],
    options,
);
export const cachedDepartment = unstable_cache(
    catalogue.department,
    ['public-department-v1'],
    options,
);
export const cachedPrograms = unstable_cache(
    catalogue.programs,
    ['public-programs-v1'],
    options,
);
export const cachedProgram = unstable_cache(
    catalogue.program,
    ['public-program-v1'],
    options,
);
export const cachedModules = unstable_cache(
    catalogue.modules,
    ['public-modules-v1'],
    options,
);
