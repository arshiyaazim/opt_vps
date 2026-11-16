import importlib.util
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'scripts/operations/import_sources.py'
spec=importlib.util.spec_from_file_location('extract',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
a=module.parse_line('ID: 01712345678 Worker 01812345678(B) 500/-')
assert a['employeePhone']=='01712345678' and a['payoutPhone']=='01812345678' and a['amountCents']==50000
assert module.parse_line('01712345678 (N) 200/-')['amountCents']==20000
assert module.parse_line('জমা =75,000/-') is None
assert module.parse_line('ID: 01712345678 Worker 01812345678(B) 500/-')==a
assert module.phone(1712345678)=='01712345678'
assert module.phone('01212345678')==''
print('Cash extraction checks passed.')
