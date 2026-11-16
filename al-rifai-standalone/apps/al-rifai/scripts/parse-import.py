"""Parse original files only; no identity authority, ledger or network access."""
import sys,json,csv,io,base64,re,datetime,collections
job=json.load(sys.stdin);blob=base64.b64decode(job['content']);name=job['name'].lower();rows=[]

# WhatsApp exported text files appear in several locale/OS variants. Each pattern
# captures (day, month, year, hour, minute, optional second, optional meridiem,
# sender, text). Day/month order stays DD/MM; ambiguous exports are preserved as
# evidence and never silently reinterpreted.
TXT_PATTERNS=[
 re.compile(r'^\[(\d{1,2})/(\d{1,2})/(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\] ([^:]+): ?(.*)$'),
 re.compile(r'^(\d{1,2})/(\d{1,2})/(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])? - ([^:]+): ?(.*)$'),
]

def parse_txt_header(line):
 for pattern in TXT_PATTERNS:
  m=pattern.match(line)
  if not m:continue
  day,month,year,hour,minute,second,meridiem,sender,text=m.groups()
  hour=int(hour);minute=int(minute);second=int(second or 0)
  if meridiem:
   marker=meridiem.lower()
   if hour==12:hour=0
   if marker=='pm':hour+=12
  try:
   at=datetime.datetime(int(year),int(month),int(day),hour,minute,second,
    tzinfo=datetime.timezone(datetime.timedelta(hours=6))).isoformat()
  except ValueError:
   at=None
  return {'sourceTime':at,'senderLabel':sender.strip(),'text':text,'originalHeader':line}
 return None

if name.endswith('.txt'):
 messages=[]
 for line in blob.decode('utf-8-sig').splitlines():
  parsed=parse_txt_header(line)
  if parsed is not None:
   messages.append(parsed)
  elif messages:messages[-1]['text']+='\n'+line
 if not messages:raise ValueError('No supported WhatsApp text export found (bracketed/plain, 24-hour or AM/PM); original retained')
 occurrence=collections.Counter()
 for m in messages:
  anchor=str(m['sourceTime'])+'|'+m['senderLabel'];occurrence[anchor]+=1;m['externalId']=anchor+'|occurrence:'+str(occurrence[anchor]);rows.append(m)
elif name.endswith('.csv'):rows=[dict(r) for r in csv.DictReader(io.StringIO(blob.decode('utf-8-sig'))) ]
elif name.endswith('.json'):
 data=json.loads(blob);rows=data if isinstance(data,list) else data['records']
elif name.endswith('.xlsx'):
 import openpyxl
 book=openpyxl.load_workbook(io.BytesIO(blob),read_only=True,data_only=True)
 for sheet in book:
  it=iter(sheet.values);headers=[str(x or '') for x in next(it,[])];rows.extend({k:(v.isoformat() if hasattr(v,'isoformat') else v) for k,v in zip(headers,r)} for r in it if any(v is not None for v in r))
else:raise ValueError('Use TXT/CSV/JSON/XLSX; document images require protected evidence review')
if len(rows)>50000:raise ValueError('At most 50000 source rows per file')
json.dump({'rows':rows,'kind':'conversation' if name.endswith('.txt') else 'structured'},sys.stdout,ensure_ascii=False,default=str)
