'use client';
import {useState,type ReactNode} from 'react';
import {createElement} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import * as Icons from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {NAV_ITEMS,CONSOLIDATED_LINKS,NAV_ICONS,navItemForPath,type NavItem} from '@/app/platform/nav';
import {
  Breadcrumb,BreadcrumbItem,BreadcrumbList,BreadcrumbLink,BreadcrumbPage,BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import {cn} from '@/lib/utils';
import type {ChatGPTUser} from '@/app/chatgpt-auth';

export type ShellUser=ChatGPTUser&{admin:boolean;superAdmin?:boolean};

function iconFor(name:string):LucideIcon{
  return NAV_ICONS[name]??Icons.Menu;
}

function LegacyLinks(){
  return <div className="mt-2 border-t pt-2">
    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Consolidated tools</p>
    {Object.entries(CONSOLIDATED_LINKS).map(([oldLabel,href])=>(
      <Button key={href} asChild variant="ghost" className="h-8 w-full justify-start px-2 text-xs text-muted-foreground">
        <Link href={href} title={`${oldLabel} — functionality preserved, integrated elsewhere`}>↳ {oldLabel}</Link>
      </Button>
    ))}
  </div>;
}

function SignOutButton({className}:{className?:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function signOut(){
    setBusy(true);
    try{
      const session=await fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
      await fetch('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':session?.csrf||''},cache:'no-store'});
    }catch{
      // A failed sign-out still returns the user to the sign-in page.
    }
    router.replace('/login');
    router.refresh();
  }
  return <Button variant="ghost" size="sm" className={className} onClick={()=>void signOut()} disabled={busy}>
    <Icons.LogOut className="size-3.5"/>Sign out
  </Button>;
}

function SidebarContent({user,collapsed,onToggle,navigateAway}:{user:ShellUser;collapsed:boolean;onToggle:()=>void;navigateAway?:()=>void}){  const pathname=usePathname();
  const [query,setQuery]=useState('');
  const current=navItemForPath(pathname);
  const visible=NAV_ITEMS.filter((item)=>(!item.restricted||user.superAdmin===true)&&(!item.adminOnly||user.admin===true)&&(!query
    ||item.label.toLowerCase().includes(query.toLowerCase())
    ||item.description.toLowerCase().includes(query.toLowerCase())));
  const renderItem=(item:NavItem)=>{
    const ItemIcon=iconFor(item.icon);
    const active=current.href===item.href;
    return (
      <Button key={item.href} asChild variant={active?'secondary':'ghost'}
        className="w-full justify-start gap-2" aria-current={active?'page':undefined}>
        <Link href={item.href} title={collapsed?item.label:item.description} onClick={navigateAway}>
          <ItemIcon className="size-4 shrink-0" aria-hidden/>
          {!collapsed&&<span className="truncate">{item.label}{item.labelBn&&<span className="ml-1 text-[10px] text-muted-foreground">{item.labelBn}</span>}</span>}
        </Link>
      </Button>
    );
  };
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        {!collapsed&&<div className="min-w-0">
          <p className="truncate text-base font-semibold">AL-RIFA’I</p>
          <p className="truncate text-[11px] text-muted-foreground">Marine Workforce &amp; Cash Platform</p>
        </div>}
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}>
          {collapsed?<Icons.PanelLeftOpen className="size-4"/>:<Icons.PanelLeftClose className="size-4"/>}
        </Button>
      </div>
      {!collapsed&&(
        <Input type="search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search navigation…" aria-label="Search navigation"/>
      )}
      <nav aria-label="Main navigation" className="flex flex-col gap-1 overflow-y-auto">
        {visible.map(renderItem)}
        {!collapsed&&<LegacyLinks/>}
      </nav>
      <div className="mt-auto border-t pt-2 text-xs text-muted-foreground">
        {!collapsed&&(
          <>
            <p className="font-medium text-foreground">{user.displayName}</p>
            <p>role: {user.admin?'admin / supervisor':'standard'} · Private workspace</p>
          </>
        )}
        <Link href="/cash" className="mt-1 inline-block underline-offset-2 hover:underline">Cash portal ↗</Link>
        {user.source==='session'&&<SignOutButton className="mt-1 h-7 w-full justify-start px-0 text-xs"/>}
      </div>
    </div>
  );
}

function Breadcrumbs({label}:{label:string}){
  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link href="/dashboard">Workspace</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator/>
        <BreadcrumbItem><BreadcrumbPage>{label}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppShell({user,label,title,actions,children}:{user:ShellUser;label?:string;title?:string;actions?:ReactNode;children:ReactNode}){
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const pathname=usePathname();
  const current=navItemForPath(pathname);
  const closeMobile=()=>setMobileOpen(false);
  return (
    <div className="wx-shell flex min-h-dvh bg-background text-foreground">
      <aside data-collapsed={collapsed}
        className={cn('sticky top-0 hidden h-dvh shrink-0 border-r transition-[width] md:block',collapsed?'w-16':'w-64')}>
        <SidebarContent user={user} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation menu">
                <Icons.Menu className="size-4"/>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
              <div className="h-full overflow-y-auto">
                <SidebarContent user={user} collapsed={false} onToggle={closeMobile} navigateAway={closeMobile}/>
              </div>
            </SheetContent>
          </Sheet>
          {createElement(iconFor(current.icon),{className:'hidden size-4 text-muted-foreground sm:block','aria-hidden':true})}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">{title??label??current.label}</h1>
            {title&&<p className="truncate text-xs text-muted-foreground">{current.description}</p>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Breadcrumbs label={current.label}/>
            <span className="hidden text-xs text-muted-foreground lg:inline">{user.displayName}</span>
            {actions}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-5">{children}</main>
        <footer className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          Read-only platform surfaces · verified data only · Cash posting and approvals remain behind existing authorization
        </footer>
      </div>
    </div>
  );
}
