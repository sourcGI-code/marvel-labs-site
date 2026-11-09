"""Preserve every native render and fill only the intermediate motion frames."""
from pathlib import Path
import subprocess,time,json,shutil,hashlib
from PIL import Image

W=Path('/scratch/marvel-scene-recovery-20261109')
SOURCE=W/'workday-frames';DEST=W/'workday-motion-frames';DEST.mkdir(exist_ok=True)
TOOL=W/'interpolation-tools/rife-ncnn-vulkan-20221029-ubuntu'
# Official portable release: https://github.com/nihui/rife-ncnn-vulkan/releases/tag/20221029
# Archive SHA256: 1e2c7ee7fa7daa326542d50622f0afedc80cf6f1858bda411d16385ffa5cdf68
SHOTS=[0,300,624,804,1134,1290,1416,2734,2812,3088]
CUTS=sorted({f for a,b in zip(SHOTS,SHOTS[1:]) for f in range(a,b,240)}|{SHOTS[-1]})
state={'revision':'rife-4.6-native-frames-preserved','completed':[],'started':time.time()}
def save(**kw):
 state.update(kw);p=W/'motion-status.pending.json';p.write_text(json.dumps(state,indent=2));p.replace(W/'motion-status.json')
def valid(p):
 if not p.exists():return False
 try:
  with Image.open(p) as im:return im.size==(1920,1200)
 except OSError:return False
def link(src,dest):
 if not dest.exists():dest.symlink_to(src)
for n,(start,end) in enumerate(zip(CUTS,CUTS[1:])):
 name=f'workday-{n}';part=W/'motion-parts'/name;inp=part/'input';out=part/'output'
 inp.mkdir(parents=True,exist_ok=True);out.mkdir(exist_ok=True)
 shot_end=min(f for f in SHOTS if f>=end)
 source_end=min(shot_end,end+2)
 indices=list(range(start,source_end,2))
 required=indices+([2734] if start<=2733<end else [])
 while not all(valid(SOURCE/f'{f:05}.png') for f in required):save(phase='waiting-for-render',current=name);time.sleep(5)
 if all(valid(DEST/f'{f:05}.png') for f in range(start,end)):
  state['completed'].append(name);continue
 for i,f in enumerate(indices):
  target=inp/f'{i:05}.png'
  # The portable directory reader accepts regular files, not symbolic links.
  if target.is_symlink():target.unlink()
  if not target.exists():target.hardlink_to(SOURCE/f'{f:05}.png')
 save(phase='interpolating',current=name)
 with (part/'rife.log').open('w') as log:
  subprocess.run([str(TOOL/'rife-ncnn-vulkan'),'-i',str(inp),'-o',str(out),'-m',str(TOOL/'rife-v4.6'),'-g','0','-j','2:1:2','-f','%08d.png'],stdout=log,stderr=log,check=True)
 for f in range(start,end):
  dest=DEST/f'{f:05}.png'
  if dest.exists():continue
  if f%2==0:link(SOURCE/f'{f:05}.png',dest)
  elif f==2733:link(SOURCE/'02734.png',dest) # Exact authored cut falls between two native samples.
  elif f+1==shot_end:link(SOURCE/f'{f-1:05}.png',dest)
  else:
   generated=out/f'{f-start+1:08}.png';assert valid(generated),generated;generated.replace(dest)
 assert all(valid(DEST/f'{f:05}.png') for f in range(start,end))
 # Native frames are linked verbatim; discard the interpolator's redundant copies.
 for p in out.glob('*.png'):p.unlink()
 state['completed'].append(name);save(phase='waiting-for-render',current=None)
save(phase='complete',finished=time.time(),frames=3088,nativeFrames=1544,source='workday-corrected-realism-v2.blend')
