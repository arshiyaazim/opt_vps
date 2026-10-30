export type NavItem={
  href:string;
  label:string;
  labelBn?:string;
  icon:string; // lucide-react icon name, resolved in app-shell
  description:string;
  restricted?:boolean;
  // Presentation-only: shown when the shell resolves an Admin identity. Used
  // instead of `restricted` because `restricted` keys off `superAdmin`, which is
  // undefined when a platform page is opened with the legacy validation
  // credential — that would hide the entry from the Admin in shadow mode.
  adminOnly?:boolean;
};

export type NavGroup={label?:string;items:NavItem[]};

export const NAV_GROUPS:NavGroup[]=[
  {label:"Cash",items:[
    {href:"/cash",label:"Cash",icon:"Wallet",description:"Cash Portal, submissions and financial activity"},
    {href:"/cash/submissions",label:"Cash Submissions",labelBn:"ক্যাশ জমা",icon:"ClipboardCheck",description:"Submit and track Cash submissions; reviewers see their authorized queue"},
    {href:"/transactions",label:"Transactions",labelBn:"লেনদেন",icon:"ArrowLeftRight",description:"Cash instructions, payment records and evidence"},
    {href:"/income-expenditure",label:"Income & Expenditure",labelBn:"আয়-ব্যয়",icon:"Wallet",description:"Financial analysis with verified data only"},
  ]},
  {label:"Vessel Operations",items:[
    {href:"/vessel-register",label:"Vessel Register",labelBn:"ভেসেল রেজিস্টার",icon:"Ship",description:"Programs, assignments, release, void and audit history"},
    {href:"/vessel",label:"Programs & Assignments",icon:"ClipboardList",description:"Vessel program workflow and assignments"},
  ]},
  {items:[
    {href:"/employees",label:"Employees",labelBn:"কর্মচারী",icon:"Users",description:"Employee master records and payment statements"},
  ]},
  {items:[
    {href:"/sources-review",label:"Review Queue",labelBn:"পর্যালোচনা",icon:"ClipboardCheck",description:"Vessel and WhatsApp source review; Cash submissions stay separate"},
  ]},
  {items:[
    {href:"/assistant",label:"Assistant",icon:"Sparkles",description:"Ask anything about verified records"},
  ]},
  {label:"Records",items:[
    {href:"/insights",label:"Operational Insights",labelBn:"পরিসংখ্যান",icon:"ChartLine",description:"Workforce, payment and vessel analytics"},
    {href:"/archive",label:"Archive",labelBn:"আর্কাইভ",icon:"Archive",description:"Historical messages, cashbook and program history"},
  ]},
  {label:"Administration",items:[
    {href:"/admin",label:"Admin Panel",icon:"ShieldCheck",description:"Accounts, roles, permissions and audit history",restricted:true},
  ]},
];

export const NAV_ITEMS= NAV_GROUPS.flatMap((group)=>group.items);

import {LayoutDashboard,Ship,ArrowLeftRight,Users,ChartLine,Wallet,Archive,ClipboardCheck,ClipboardList,Sparkles,ShieldCheck,type LucideIcon} from 'lucide-react';

export const NAV_ICONS:Record<string,LucideIcon>={
  LayoutDashboard,
  Ship,
  ArrowLeftRight,
  Users,
  ChartLine,
  Wallet,
  Archive,
  ClipboardCheck,
  ClipboardList,
  Sparkles,
  ShieldCheck,
};

const DEFAULT_NAV_ITEM:NavItem={
  href:"/dashboard",
  label:"Dashboard",
  icon:"LayoutDashboard",
  description:"Unified financial, workforce and review overview",
};

export function navItemForPath(pathname:string):NavItem{
  const matches=NAV_ITEMS.filter((item)=>pathname===item.href||pathname.startsWith(item.href+"/"));
  return matches.sort((a,b)=>b.href.length-a.href.length)[0]??DEFAULT_NAV_ITEM;
}
