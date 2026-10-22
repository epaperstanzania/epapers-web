import { CataloguePage } from '../../../../components/catalogue';
export const metadata={title:'Program'};
export default async function Page({params,searchParams}:{params:Promise<Record<string,string>>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CataloguePage kind="program" params={await params} query={await searchParams}/>;}
