-- Cocktails become a first-class kind alongside spirit / beer / wine, so the
-- menu can carry the bar's own drinks next to the bottles they are built from.
--
-- ALTER TYPE ... ADD VALUE cannot be used by other statements in the same
-- transaction, which is why this migration does nothing else.

alter type catalog_kind add value if not exists 'cocktail';
