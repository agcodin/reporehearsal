import CandidateScreen from"./CandidateScreen";export default async function Page({params}:{params:Promise<{token:string}>}){const{token}=await params;return <CandidateScreen token={token}/>}
