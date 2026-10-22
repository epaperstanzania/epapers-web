import { describe,it,expect,vi,afterEach } from 'vitest';
import { db } from '@epapers/database';
import { enforceWritePolicy } from '@epapers/server/lib/write-policy';
afterEach(()=>vi.restoreAllMocks());
describe('read-only recovery policy',()=>{
 it('blocks ordinary business writes when read-only is enabled',async()=>{
  vi.spyOn(db.appSetting,'findUnique').mockResolvedValue({key:'readOnly',value:true,updatedAt:new Date(),updatedByUserId:null});
  for(const name of ['papers','uploads/presign','papers/[id]/download-url','users/me/account'])await expect(enforceWritePolicy(name,'POST')).rejects.toThrow('read-only');
 });
 it('keeps authentication, administration and reads available for recovery',async()=>{
  const read=vi.spyOn(db.appSetting,'findUnique');
  for(const [name,method] of [['auth/login','POST'],['admin/settings','PATCH'],['papers','GET']])await enforceWritePolicy(name,method);
  expect(read).not.toHaveBeenCalled();
 });
});
