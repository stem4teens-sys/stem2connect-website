# Globe map data

Land outlines: Natural Earth, 1:110m physical land dataset.
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
Terms: https://www.naturalearthdata.com/about/terms-of-use/
Natural Earth data is in the public domain. Coordinates are rounded to three decimal places and attributes are omitted for the decorative globe texture. Nodes and routes are illustrative, not a map of actual STEM2Connect chapters.

The globe, stand, satellite and orbital geometry are generated locally in Three.js.

The pre-baked `earth-color.webp` and `earth-relief.webp` use the same land outlines, with subtle country borders from Natural Earth's public-domain 1:110m Admin 0 Countries dataset:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
The browser loads these small textures directly; it no longer downloads or draws the geographic polygons. The stylized student figures are original procedural geometry and, like the routes, illustrate a global learning community rather than actual chapter membership.
