import { blankProgram,type Program } from "./programs";
// Complete user-provided rows visible in the 02 September conversation excerpts.
export const seed:Program[]=[
 ["Elim Inspire/Nabil","ST-1","01329620136","Rupshi","Md. Mushain Mia","01339620136","2026-08-01","D"],
 ["Qing Quon Shan","Imtiaz","01612074203","Rupshi","Md. Moynul Islam Tayef","01342558527","2026-08-01","D"],
 ["African Isabella","Nodir Jhilik-5","01679292093","Rupshi","Bashu Deb Das","01822663042","2026-08-01","D"],
 ["Crimson GR","Six Sisters-4","01724636065","Noapara","Md. Kurban Ali","01868087651","2026-08-10","N"],
 ["Crimson GR","Sumiya Hossain-4","01712849339","Chattogram","Md. Sihab Uddin","01326356501","2026-08-10","N"],
].map((r,i)=>({...blankProgram(),id:`recovered-${i+1}`,motherVessel:`M.V. ${r[0]}`,lighterVessel:`M.V. ${r[1]}`,masterMobile:r[2],destination:r[3],escortName:r[4],escortMobile:r[5],startDate:r[6],shift:r[7],source:"Recovered excerpt · 02 Sep 2026",notes:"Al-Rifa'i Integrated Services. Complete source row from an earlier conversation excerpt; full historical register not yet imported.",createdAt:"2026-10-01T14:12:42.000Z"}));
