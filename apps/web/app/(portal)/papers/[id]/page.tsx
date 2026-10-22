import { CataloguePage } from '../../../../components/catalogue';
export const metadata={title:'Paper'};
export default async function Page({params,searchParams}:{params:Promise<Record<string,string>>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CataloguePage kind="paper" params={await params} query={await searchParams}/>;}
