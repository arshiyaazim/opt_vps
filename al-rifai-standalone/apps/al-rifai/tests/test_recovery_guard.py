import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('recovery',pathlib.Path(__file__).parents[1]/'scripts/operations/recovery.py');recovery=importlib.util.module_from_spec(spec);spec.loader.exec_module(recovery)
class Guards(unittest.TestCase):
 def test_exact_disposable_target(self):self.assertEqual(recovery.guard_target('alrifai_restore_validation_20261016_120000'),'alrifai_restore_validation_20261016_120000')
 def test_live_or_ambiguous_target_denied(self):
  for target in ['alrifai','postgres','template0','template1','alrifai_restore_test','alrifai_restore_validation_20261016_120000;DROP DATABASE alrifai','alrifai_restore_validation_20261016_120000_extra','']:
   with self.assertRaises(ValueError):recovery.guard_target(target)
if __name__=='__main__':unittest.main()
