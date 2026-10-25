from pathlib import Path
from PIL import Image
import os,io,json,base64,concurrent.futures
OUT=Path(__file__).resolve().parents[1];FRAMES=Path(__file__).resolve().parent/'.frames'
def convert(p):
 target=OUT/'assets/gif'/(p.stem+'.gif')
 if target.exists() and not os.getenv('FORCE_YOON'):return
 frames=json.loads(p.read_text());imgs=[Image.open(io.BytesIO(base64.b64decode(f['png']))).convert('RGB') for f in frames]
 # One global palette prevents color flicker between animation frames.
 palette=imgs[-1].quantize(colors=128);imgs=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in imgs]
 imgs[0].save(target,save_all=True,append_images=imgs[1:],duration=[f['duration'] for f in frames],loop=0,optimize=False,disposal=2)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(convert,FRAMES.glob('*.json')))
print('GIF files',len(list((OUT/'assets/gif').glob('*.gif'))))
