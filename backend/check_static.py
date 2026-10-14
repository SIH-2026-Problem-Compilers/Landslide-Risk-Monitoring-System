"""
One-shot script: sample real Lithology/Slope/pga from NASA static rasters
at every NER zone coordinate and update ZONE_PARAMS in scorer.py with real values.
Run from backend/ with the venv active:
    .venv\Scripts\python.exe check_static.py
"""
import sys, math
sys.path.insert(0, '.')

import xarray as xr
from app import config, zones, scorer

s = config.STATIC_DIR
print("Opening static rasters...")
ds_lith  = xr.open_dataset(str(s / 'Lithology.nc4'))
ds_slope = xr.open_dataset(str(s / 'Slope.nc4'))
ds_pga   = xr.open_dataset(str(s / 'pga.nc4'))
print("  OK\n")

print(f"{'Zone':<30} {'Lat':>6} {'Lon':>7}  {'Lith_real':>10} {'Lith_demo':>10}  {'Slope_real':>11} {'Slope_demo':>11}  {'pga_real':>9} {'pga_demo':>9}")
print("-"*115)

updates = {}
for zone in zones.MONITORING_ZONES:
    lat, lon = zone['latitude'], zone['longitude']
    zid = zone['id']

    lv = float(ds_lith['Lithology'].sel(lat=lat, lon=lon, method='nearest'))
    sv = float(ds_slope['Slope'].sel(lat=lat, lon=lon, method='nearest'))
    pv = float(ds_pga['pga'].sel(lat=lat, lon=lon, method='nearest'))

    demo = scorer.ZONE_PARAMS.get(zid, {})
    dl, ds2, dp = demo.get('lithology','?'), demo.get('slope','?'), demo.get('pga','?')

    lv_r = round(lv, 1) if not math.isnan(lv) else None
    sv_r = round(sv, 1) if not math.isnan(sv) else None
    pv_r = round(pv, 4) if not math.isnan(pv) else None

    print(f"{zone['name']:<30} {lat:>6.2f} {lon:>7.2f}  {str(lv_r):>10} {str(dl):>10}  {str(sv_r):>11} {str(ds2):>11}  {str(pv_r):>9} {str(dp):>9}")

    if lv_r is not None:
        updates[zid] = {'lithology': int(round(lv_r)), 'slope': sv_r or demo.get('slope'), 'pga': pv_r or demo.get('pga')}

ds_lith.close(); ds_slope.close(); ds_pga.close()
print()
print("Real static values successfully sampled for", len(updates), "zones.")
print()
print("These values will now be written into scorer.py ZONE_PARAMS...")

# Patch ZONE_PARAMS in memory and write back to scorer.py
import re
scorer_path = config.BACKEND_DIR / 'app' / 'scorer.py'
src = scorer_path.read_text(encoding='utf-8')

for zid, vals in updates.items():
    # Replace lithology, slope, pga values for this zone_id in ZONE_PARAMS
    pattern = rf'("{zid}".*?)"lithology": \d+, "slope": [\d.]+, "pga": [\d.]+'
    replacement_check = f'"lithology": {vals["lithology"]}, "slope": {vals["slope"]}, "pga": {vals["pga"]}'

    def replacer(m):
        line = m.group(0)
        line = re.sub(r'"lithology": \d+', f'"lithology": {vals["lithology"]}', line)
        line = re.sub(r'"slope": [\d.]+', f'"slope": {vals["slope"]}', line)
        line = re.sub(r'"pga": [\d.]+', f'"pga": {vals["pga"]}', line)
        return line

    src = re.sub(
        rf'("{zid}".*?"lithology": \d+, "slope": [\d.]+, "pga": [\d.]+)',
        replacer,
        src
    )

scorer_path.write_text(src, encoding='utf-8')
print("scorer.py updated with real terrain values.")
print()
print("Next step: start the backend with:  .venv\\Scripts\\python.exe run.py")
