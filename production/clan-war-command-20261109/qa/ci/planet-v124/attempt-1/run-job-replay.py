from pathlib import Path
import os,subprocess,json,datetime
root=Path(__file__).resolve().parents[6]
out=Path(__file__).resolve().parent
node="/workspace/.cloud-tools/node22/node_modules/node/bin/node"
recipes=[("v128","qa-planet-region-kit-v128.mjs","YAUTJA_PLANET_V128_QA_OUTPUT"),("v144","qa-planet-random-v144.mjs","YAUTJA_PLANET_RANDOM_V144_QA_OUTPUT"),("v145","qa-planet-regional-random-v145.mjs","YAUTJA_PLANET_RANDOM_V145_QA_OUTPUT"),("v146","qa-planet-environment-v146.mjs","YAUTJA_PLANET_ENV_V146_QA_OUTPUT"),("v147","qa-planet-earth-v147.mjs","YAUTJA_PLANET_EARTH_V147_QA_OUTPUT"),("v150","qa-planet-relief-v150.mjs","YAUTJA_PLANET_RELIEF_V150_QA_OUTPUT"),("v154","qa-planet-traversal-v154.mjs","YAUTJA_PLANET_TRAVERSE_V154_QA_OUTPUT")]
results=[]
for version,recipe,variable in recipes:
 env=os.environ.copy();env.update({"YAUTJA_QA_BASE_URL":"http://127.0.0.1:3156","CHROMIUM_EXECUTABLE_PATH":"/usr/bin/chromium",variable:str(out/("replay-"+version))})
 row={"version":version,"recipe":recipe,"startedAt":datetime.datetime.now(datetime.timezone.utc).isoformat()}
 results.append(row);(out/"replay-progress.json").write_text(json.dumps(results,indent=2)+"\n")
 with (out/("replay-"+version+".log")).open("w") as log:
  result=subprocess.run([node,str(root/"scripts"/recipe)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 row.update({"exitCode":result.returncode,"endedAt":datetime.datetime.now(datetime.timezone.utc).isoformat()})
 (out/"replay-progress.json").write_text(json.dumps(results,indent=2)+"\n")
 print(version+" exit "+str(result.returncode),flush=True)
 if result.returncode:raise SystemExit(result.returncode)
