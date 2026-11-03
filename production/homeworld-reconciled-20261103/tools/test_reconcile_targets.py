import unittest
from reconcile_targets import eligible_homeworld_image,classify

class ReconciliationTests(unittest.TestCase):
 def test_rejected_portrait_is_not_a_gutter(self):
  self.assertFalse(eligible_homeworld_image('art-source/v111/archivist-conversation/rejected/indicate-gutter-r1.png'))
 def test_offworld_biome_ladder_is_not_homeworld_delivery(self):
  self.assertFalse(eligible_homeworld_image('art-source/v19/biome-decor/fungal/clm/masters/clm-maintenance-ladder-01-straight-chroma.webp'))
 def test_named_homeworld_candidate_is_eligible(self):
  self.assertTrue(eligible_homeworld_image('production/homeworld-next/native/maintenance-ladder.png'))
 def test_exact_existing_lift_overrides_historical_missing(self):
  target={'id':'target-v81-55-40','label':'ascenseur','family':'ARCHITECTURE'};old={'row':44,'values':['','','','MISSING','','','']}
  result=classify(target,old,{target['id']:[{'path':'public/game/homeworld/v82/clan-lift-cabin.png','origin':'MAIN_NAMED_SOURCE'}]},set())
  self.assertEqual(result['stateAtAudit'],'SOURCE_NOMMEE_PRESENTE');self.assertFalse(result['scopeClosed']);self.assertFalse(result['canonicalOneToOne'])
 def test_gutter_without_an_eligible_independent_source_remains_missing(self):
  target={'id':'target-v81-68-235','label':'caniveau','family':'RUE'};old={'row':239,'values':['','','','EXISTING_NEEDS_VARIANT','','','public/game/homeworld/v64/pavement.png']}
  files={'art-source/v111/archivist-conversation/rejected/indicate-gutter-r1.png','public/game/homeworld/v64/pavement.png'}
  result=classify(target,old,{},files);self.assertEqual(result['stateAtAudit'],'PIECE_INDEPENDANTE_NON_REPEREE');self.assertEqual(result['independentFilenameMatches'],[])
 def test_family_is_not_automatically_missing_or_approved(self):
  target={'id':'target-v81-55-23','label':'toit','family':'ARCHITECTURE'};old={'row':27,'values':['','','','EXISTING_NEEDS_VARIANT','','','public/game/homeworld/v64/house-a-basalt.png']}
  result=classify(target,old,{},set());self.assertEqual(result['stateAtAudit'],'FAMILLE_SEULE_A_RECONCILIER');self.assertFalse(result['humanValidated']);self.assertFalse(result['runtimeAdmissionClaimed'])

if __name__=='__main__':unittest.main()
