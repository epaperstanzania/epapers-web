-- Rename legacy seeded codes in place; preserve program IDs and all foreign keys.
-- Unique indexes reject conflicts instead of merging or removing curriculum rows.
UPDATE programs AS p
SET code = mapping.code, code_normalized = mapping.normalized, updated_at = now()
FROM (VALUES
 ('p0101ma', 'ODCE', 'odce'),
 ('p0101so', 'ODCE-SONGWE', 'odce-songwe'),
 ('p0102ma', 'BENGCE', 'bengce'),
 ('p0201ma', 'ODCOE', 'odcoe'),
 ('p0202ma', 'ODIT', 'odit'),
 ('p0203ma', 'ODMFT', 'odmft'),
 ('p0204ma', 'BENGCOE', 'bengcoe'),
 ('p0301ma', 'ODEE', 'odee'),
 ('p0302ma', 'ODERE', 'odere'),
 ('p0303ma', 'ODIAE', 'odiae'),
 ('p0304ma', 'BENGEE', 'bengee'),
 ('p0401ma', 'ODETE', 'odete'),
 ('p0402ma', 'ODCST', 'odcst'),
 ('p0403ma', 'ODBME', 'odbme'),
 ('p0404ma', 'BENGETE', 'bengete'),
 ('p0405ma', 'BENGBME', 'bengbme'),
 ('p0501ma', 'ODME', 'odme'),
 ('p0502ma', 'ODMINE', 'odmine'),
 ('p0503ma', 'BENGME', 'bengme'),
 ('p0504ma', 'BENGOGE', 'bengoge'),
 ('p0505ma', 'BENGMINE', 'bengmine'),
 ('p0601ma', 'ODSLT', 'odslt'),
 ('p0601mw', 'ODSLT-MWANZA', 'odslt-mwanza'),
 ('p0602ma', 'ODBT', 'odbt'),
 ('p0603ma', 'ODFST', 'odfst'),
 ('p0604ma', 'BTECHLS', 'btechls'),
 ('p0604mw', 'BTECHLS-MWANZA', 'btechls-mwanza'),
 ('p0701mw', 'ODLPCT', 'odlpct'),
 ('p0702mw', 'ODLPT', 'odlpt'),
 ('p0703mw', 'ODFPT', 'odfpt'),
 ('p0704mw', 'ODTT', 'odtt'),
 ('p0705mw', 'ODAPHT', 'odapht'),
 ('p0706mw', 'ODFDT', 'odfdt'),
 ('p0707mw', 'ODABPT', 'odabpt'),
 ('p0801ma', 'ODGENERAL', 'odgeneral'),
 ('p0802ma', 'BENGGENERAL', 'benggeneral')
) AS mapping(legacy, code, normalized)
WHERE p.code_normalized = mapping.legacy AND p.deleted_at IS NULL;
