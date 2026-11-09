from PIL import Image
import numpy as np,sys
from pathlib import Path
p=Path(sys.argv[1]);i=int(sys.argv[2]);a=p/f'{i:05}.actor.png';b=p/f'{i:05}.background.png'
a0=np.asarray(Image.open(a).convert('RGBA'),dtype=np.float32);b0=np.asarray(Image.open(b).convert('RGB'),dtype=np.float32)
b0+=np.array([8.2,11.3,12.4])*(1-b0/255)**2
# Preserve the original blue scene; neutral artwork does not desaturate the environment.
alpha=a0[:,:,3:]/255
out=np.clip(a0[:,:,:3]*alpha+b0*(1-alpha),0,255).astype('uint8')
pending=p/f'.{i:05}.composite.pending.png'
Image.fromarray(out).save(pending,compress_level=1)
pending.replace(p/f'{i:05}.png')
# Retain both passes for visual audit and future recomposition.
