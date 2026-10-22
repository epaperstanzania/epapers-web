import { describe,it,expect,vi } from 'vitest';
import type { User } from '@epapers/database/client';
const mocks=vi.hoisted(()=>({findMany:vi.fn(async()=>[])}));
vi.mock('@epapers/database',()=>({db:{lecturerVerification:{findMany:mocks.findMany}}}));
import { ownVerifications } from '@epapers/server/modules/admin/service';
describe('lecturer verification history ownership',()=>{
 it('scopes the query to the authenticated lecturer',async()=>{const user={id:'lecturer-id',role:'LECTURER',status:'ACTIVE',deletedAt:null,emailVerifiedAt:new Date()} as User;expect(await ownVerifications(user,{limit:25,status:'pending'})).toEqual({items:[],nextCursor:null});expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{userId:'lecturer-id',status:'pending'},take:26}));});
 it('rejects a contributor regardless of client navigation',async()=>{await expect(ownVerifications({id:'contributor-id',role:'CONTRIBUTOR',status:'ACTIVE',deletedAt:null,emailVerifiedAt:new Date()} as User,{limit:25})).rejects.toThrow('Access denied');});
});
