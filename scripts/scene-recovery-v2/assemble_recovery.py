"""Build a complete, verified release from recovered scenes without publishing partial films."""
import json,subprocess,time,shutil,hashlib,concurrent.futures
from pathlib import Path
from PIL import Image
W=Path('/scratch/marvel-scene-recovery-20261109')
REFERENCE=Path('/home/jaxon/marvel_site/trailer-colour-review-20261108')
A=W/'release-assets';E=W/'encoding-rife';E.mkdir(exist_ok=True)
SHOTS=[0,300,624,804,1134,1290,1416,2734,2812,3088]
WORKDAY_CUTS=sorted({f for a,b in zip(SHOTS,SHOTS[1:]) for f in range(a,b,240)}|{SHOTS[-1]})
STATE=W/'encoding-status.json';state={'started':time.time(),'completed':[]}
FF=['ffmpeg','-y','-v','warning','-threads','4','-filter_threads','4']
def save(**kw):
 state.update(kw);pending=STATE.with_suffix('.pending.json');pending.write_text(json.dumps(state,indent=2));pending.replace(STATE)
def run(args,name):
 with (E/(name+'.log')).open('w') as log:subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames,r_frame_rate','-of','json',str(p)]))['streams'][0]
def codec(rate='6500k',fps=30):return ['-an','-c:v','libx264','-threads','4','-preset','slow','-crf','18','-maxrate',rate,'-bufsize',str(int(rate[:-1])*2)+'k','-pix_fmt','yuv420p','-g',str(fps),'-keyint_min',str(fps),'-sc_threshold','0','-video_track_timescale','60000','-movflags','+faststart']
def ready(folder,indices):return all((folder/f'{i:05}.png').is_file() for i in indices)
def encode(folder,indices,sourcefps,frames,outfps,dest,name,rate='6500k',trim_start=0):
 if dest.exists() and int(probe(dest).get('nb_frames',0))==frames:return
 seq=E/name;seq.mkdir(exist_ok=True);dest.parent.mkdir(parents=True,exist_ok=True)
 for n,i in enumerate(indices):
  src=folder/f'{i:05}.png';assert src.is_file(),src
  link=seq/f'{n:05}.png'
  if not link.exists():link.symlink_to(src)
 # Scene-change detection prevents optical-flow blends across authored cuts.
 motion='null' if name.startswith('workday-') else f'tpad=stop_mode=clone:stop_duration=0.3,minterpolate=fps={outfps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:search_param=16:vsbmc=1:scd=fdiff:scd_threshold=5'
 vf=f'{motion},trim=start_frame={trim_start}:end_frame={trim_start+frames},setpts=PTS-STARTPTS'
 pending=dest.with_name(dest.stem+'.pending.mp4')
 run(FF+['-framerate',str(sourcefps),'-i',str(seq/'%05d.png'),'-vf',vf,'-frames:v',str(frames),*codec(rate,outfps),str(pending)],name)
 info=probe(pending);assert int(info['nb_frames'])==frames,(dest,info)
 assert pending.stat().st_size<95_000_000,(dest,pending.stat().st_size)
 pending.replace(dest)
def concat(files,dest,name):
 if dest.exists():return
 dest.parent.mkdir(parents=True,exist_ok=True);listing=E/(name+'.txt');listing.write_text(''.join("file '"+str(p)+"'\n" for p in files))
 run(FF+['-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(dest)],name)
def webp(src,dest):
 dest.parent.mkdir(parents=True,exist_ok=True);Image.open(src).convert('RGB').save(dest,quality=94,method=5)
def cargo_metadata(kind):
 j=json.loads((REFERENCE/f'assets/owner-approved-fleet-neutral-v2/{kind}.json').read_text())
 folder=W/f'fleet-{kind}'/'mono';frames=sorted(int(p.name[:5]) for p in folder.glob('*.shared-labels.json'))
 labels={f:json.loads((folder/f'{f:05}.shared-labels.json').read_text()) for f in frames}
 for s in j['samples']:
  s['factoryFeet']=6+2.5/12;s['cargoFeet']=[13+9.5/12,9+9.5/12]
  at=s['p']*(j['frames']-1);a=max((f for f in frames if f<=at),default=frames[0]);b=min((f for f in frames if f>=at),default=frames[-1]);t=(at-a)/max(1,b-a)
  for label in s.get('labels',[]):
   for key in ['x','y']:label[key]=round(labels[a][label['id']][key]*(1-t)+labels[b][label['id']][key]*t,4)
 j.update(modelRevision='realism-v2',renderRevision='scene-recovery-v2',renderer='Native realism-v2 trailer on the original blue stage; revised final comparison camera',theme='mono',sourceRenderFps=15,videoFps=30,videoWidth=4608 if kind=='desktop' else 1080,videoHeight=2048 if kind=='desktop' else 2160,draftRender=False,previewOnly=False)
 j['layoutRevision']='20ft-up-left-with-16ft-anchor-preserved'
 return j
def presentation(scene,kind):
 folder=W/('intro-'+kind if scene=='opening' else 'fleet-'+kind)/'mono';dest=A/scene
 if scene=='opening':
  for name in ['poster','hero']:webp(folder/'00838.png',dest/f'{kind}-{name}.webp')
 else:
  j=cargo_metadata(kind)
  for still in j['stills']:
   frame=round(still['p']*(j['frames']-1)/2)*2;frame=max(0,min(540,frame));webp(folder/f'{frame:05}.png',dest/still['file'])
  # Use the completed comparison for a useful static page fallback.
  webp(folder/'00540.png',dest/f'{kind}-poster.webp')
  (dest/f'{kind}.json').write_text(json.dumps(j,separators=(',',':')))
def field():
 dest=A/'field';dest.mkdir(parents=True,exist_ok=True)
 cuts=WORKDAY_CUTS
 concat([E/f'workday-{i}.mp4' for i in range(len(cuts)-1)],dest/'desktop.mp4','workday-joined')
 for kind,size,rate in [('mobile','1440:900','4000k'),('desktop-lite','960:600','1800k'),('mobile-lite','960:600','1800k')]:
  output=dest/f'{kind}.mp4'
  if not output.exists():run(FF+['-i',str(dest/'desktop.mp4'),'-vf',f'scale={size}:flags=lanczos',*codec(rate),str(output)],'workday-'+kind)
 for kind in ['desktop','mobile']:
  source=REFERENCE/('assets/owner-package-workday-v2/desktop.json' if kind=='desktop' else 'assets/workday-mobile-sharp-v1/mobile.json')
  j=json.loads(source.read_text());j.update(modelRevision='realism-v2',renderRevision='scene-recovery-v2',renderer='Owner-corrected package and workday scene; original cameras, animation, contacts and visibility; realism-v2 exterior mesh replacement',packageRevision='owner-package-v2',deliveryRevision='owner-corrected-preserved-animation',theme='mono',sourceRenderFps=15,videoFps=30,videoWidth=1920 if kind=='desktop' else 1440,videoHeight=1200 if kind=='desktop' else 900)
  j['animationSHA256']='3891326ea6294683f06e13d4f3a053285dae9e8ddc0e1f50e36cd56f7abf598a'
  j['interpolationRevision']='rife-4.6-native-frames-preserved'
  j['howItWorks']['deliveryFingerprint']='owner-package-v2-preserved-realism-v2'
  for n,still in enumerate(j['stills']):
   run(FF+['-ss',str(still['p']*3087/30),'-i',str(dest/f'{kind}.mp4'),'-frames:v','1','-c:v','libwebp','-quality','94',str(dest/still['file'])],f'workday-{kind}-still-{n}')
  shutil.copyfile(dest/j['stills'][0]['file'],dest/f'{kind}-poster.webp');(dest/f'{kind}.json').write_text(json.dumps(j,separators=(',',':')))
 for name,start,end in [('load',0,10),('pickup',20.8,26.8),('dropoff',26.8,37.8),('equipment',59.2,69.2),('mow',98.2,102.9)]:
  output=A/'clips'/f'{name}.mp4';output.parent.mkdir(exist_ok=True)
  run(FF+['-ss',str(start),'-i',str(dest/'desktop.mp4'),'-t',str(end-start),*codec(),str(output)],'clip-'+name)
  run(FF+['-ss',str(min(2,(end-start)/2)),'-i',str(output),'-frames:v','1','-c:v','libwebp','-quality','94',str(output.with_suffix('.webp'))],'clip-poster-'+name)
 for p in dest.glob('*.mp4'):assert int(probe(p)['nb_frames'])==3088,(p,probe(p))
jobs=[]
for scene,prefix,count,sourcefps,outfps,rate in [('opening','intro',840,42,60,'22000k'),('cargo','fleet',541,15,30,'26000k')]:
 for kind in ['desktop','mobile']:
  folder=W/f'{prefix}-{kind}'/'mono';indices=range(0,count,2);name=f'{prefix}-{kind}'
  def perform(scene=scene,kind=kind,folder=folder,indices=indices,sourcefps=sourcefps,outfps=outfps,rate=rate,name=name):
   encode(folder,indices,sourcefps,600 if scene=='opening' else 541,outfps,A/scene/f'{kind}.mp4',name,rate if kind=='desktop' else '10000k');presentation(scene,kind)
  jobs.append((name,lambda folder=folder,indices=indices:ready(folder,indices),perform))
cuts=WORKDAY_CUTS
for n,(start,end) in enumerate(zip(cuts,cuts[1:])):
 name=f'workday-{n}'
 indices=range(start,end)
 def perform(n=n,indices=indices,start=start,end=end,name=name):encode(W/'workday-motion-frames',indices,30,end-start,30,E/f'{name}.mp4',name)
 jobs.append((name,lambda indices=indices:ready(W/'workday-motion-frames',indices),perform))
jobs.append(('field-complete',lambda:all((E/f'workday-{i}.mp4').is_file() for i in range(len(cuts)-1)),field))
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  running={}
  while jobs or running:
   for future,name in list(running.items()):
    if future.done():future.result();state['completed'].append(name);del running[future]
   for job in list(jobs):
    if len(running)>=4:break
    name,isready,perform=job
    if not isready():continue
    running[pool.submit(perform)]=name;jobs.remove(job)
   save(phase='encoding' if running else 'waiting',current=list(running.values()),pending=[j[0] for j in jobs])
   if jobs or running:time.sleep(5)
 report={str(p.relative_to(A)):{**probe(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in A.rglob('*.mp4')}
 (W/'media-validation.json').write_text(json.dumps(report,indent=2));save(phase='complete',finished=time.time())
except Exception as e:save(phase='failed',error=str(e));raise
