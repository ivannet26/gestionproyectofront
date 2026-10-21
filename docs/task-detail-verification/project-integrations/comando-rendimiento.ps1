$env:AUTH_TEST_SQLITE='1'; .venv/Scripts/python.exe -c @'
import os,django,types,subprocess,time,json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.test.utils import CaptureQueriesContext,setup_test_environment
setup_test_environment()
from django.db import connection
from apps.projects.tests.test_project_integrations import ProjectIntegrationTests
from apps.projects.models import Task
from apps.projects.services.presentation import task_snapshots
baseline=types.ModuleType('apps.projects.services.baseline_presentation');baseline.__package__='apps.projects.services'
exec(compile(subprocess.check_output(['git','show','HEAD:apps/projects/services/presentation.py'],text=True),'<committed-presentation>','exec'),baseline.__dict__)
ProjectIntegrationTests.setUpClass();f=ProjectIntegrationTests();f.setUp()
try:
 p=f.assigned_project();results=[]
 for n in (10,100):
  Task.objects.bulk_create([Task(project=p,name='Sintetica',state_code='PENDIENTE',start_date=p.start_date,responsible_id=f.worker.worker_id) for i in range(n-Task.objects.count())])
  for name,fn in [('HEAD',baseline.task_snapshots),('working',task_snapshots)]:
   times=[]
   for run in range(3):
    rows=Task.objects.filter(project=p).select_related('responsible');start=time.perf_counter()
    with CaptureQueriesContext(connection) as queries:data=fn(rows,p,f.admin)
    times.append(round((time.perf_counter()-start)*1000,2))
   results.append({'version':name,'tasks':n,'queries':len(queries),'milliseconds':times,'response_bytes':len(json.dumps(data,default=str).encode())})
 print(json.dumps({'environment':'SQLite explicit isolated synthetic mode; snapshot service only, not MySQL latency or HTTP','measurements':results},indent=2))
finally:
 f.tearDown();ProjectIntegrationTests.tearDownClass()
'@
