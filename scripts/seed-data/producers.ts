export type SeedProducer = {
  name: string
  country: string
  region?: string
  founded_year?: number
  description: string
  website?: string
}

export const PRODUCERS: SeedProducer[] = [
  // --- Rum ------------------------------------------------------------------
  {
    name: 'Hampden Estate',
    country: 'Jamaica',
    region: 'Trelawny',
    founded_year: 1753,
    description:
      'Trelawny distillery famous for wild fermentation and some of the highest-ester rums made anywhere. No sugar or colouring is added to any Hampden bottling, and every drop comes off two double-retort pot stills.',
    website: 'https://hampdenrumco.com',
  },
  {
    name: 'Appleton Estate',
    country: 'Jamaica',
    region: 'Nassau Valley',
    founded_year: 1749,
    description:
      "Jamaica's oldest continuously operating sugar estate and distillery, working from its own limestone-filtered spring water and blending pot and column distillate under master blender Joy Spence.",
  },
  {
    name: 'Worthy Park Estate',
    country: 'Jamaica',
    region: 'Lluidas Vale',
    founded_year: 1741,
    description:
      'A single estate in a bowl-shaped valley that grows its own cane, mills it, ferments it, and distils on one Forsyths double-retort pot still. Rebuilt its distillery in 2005 after a 45-year pause.',
  },
  {
    name: 'Rhum J.M',
    country: 'Martinique',
    region: 'Macouba',
    founded_year: 1845,
    description:
      "Sits at the foot of Mount Pelée on volcanic soil, with the shortest cane-to-still distance in Martinique — under an hour. AOC Martinique in every expression.",
  },
  {
    name: 'Neisson',
    country: 'Martinique',
    region: 'Le Carbet',
    founded_year: 1931,
    description:
      'Family-run and famously uncompromising: estate cane, a single creole column, and a house style built around aromatic intensity rather than softness.',
  },
  {
    name: 'Foursquare Distillery',
    country: 'Barbados',
    region: 'Saint Philip',
    founded_year: 1996,
    description:
      'Richard Seale\'s distillery on a former sugar plantation, built on a doctrine of no additives, no sugar, and full disclosure of pot/column ratio and cask type.',
  },
  {
    name: 'Mount Gay Distilleries',
    country: 'Barbados',
    region: 'Saint Lucy',
    founded_year: 1703,
    description:
      'The oldest rum brand with a documented deed, drawing coral-filtered water from its own wells and blending twin-column and pot distillate.',
  },
  {
    name: 'Demerara Distillers',
    country: 'Guyana',
    region: 'Demerara',
    founded_year: 1670,
    description:
      "Custodian of the last wooden stills on earth — the Port Mourant double wooden pot still, the Versailles single wooden pot, and the Enmore wooden Coffey still.",
  },
  {
    name: 'Avuá Cachaça',
    country: 'Brazil',
    region: 'Rio de Janeiro',
    founded_year: 2012,
    description:
      'Single-estate cachaça from Fazenda da Quinta, hand-cut cane, copper pot distilled, and rested in Brazilian hardwoods rather than oak.',
  },
  {
    name: 'Novo Fogo',
    country: 'Brazil',
    region: 'Morretes, Paraná',
    founded_year: 2004,
    description:
      'Certified organic and carbon-negative, sitting inside the Atlantic rainforest with its own cane fields and a zero-waste distillery.',
  },
  {
    name: 'Chelo (Clairin Sajous)',
    country: 'Haiti',
    region: 'Saint-Michel-de-l\'Attalaye',
    description:
      'One of the small Haitian distilleries in the Clairin project — organic cane, wild fermentation with no added yeast, and a single creole column.',
  },
  {
    name: 'Distillerie Vaval',
    country: 'Haiti',
    region: 'Cavaillon',
    description:
      'Faubert Vaval\'s distillery, working Hawaii Blanche cane, natural fermentation of the cane juice, and a small creole column.',
  },
  {
    name: 'By The Dutch',
    country: 'Indonesia',
    region: 'Java',
    description:
      'Batavia Arrack producer working the traditional Javanese method: sugarcane molasses fermented with red rice cakes and wild yeasts.',
  },

  // --- Whiskey --------------------------------------------------------------
  {
    name: 'Wild Turkey',
    country: 'United States',
    region: 'Lawrenceburg, Kentucky',
    founded_year: 1869,
    description:
      'Known for low barrel entry proof and heavy #4 alligator char. Jimmy and Eddie Russell have between them well over a century of service at the distillery.',
  },
  {
    name: 'Four Roses',
    country: 'United States',
    region: 'Lawrenceburg, Kentucky',
    founded_year: 1888,
    description:
      'Runs two mash bills against five proprietary yeast strains to make ten distinct recipes, matured in single-story rickhouses unique in Kentucky.',
  },
  {
    name: 'Buffalo Trace Distillery',
    country: 'United States',
    region: 'Frankfort, Kentucky',
    founded_year: 1775,
    description:
      'A National Historic Landmark on the Kentucky River that distilled through Prohibition under a medicinal licence, and now runs one of the industry\'s largest experimental programmes.',
  },
  {
    name: 'Brown-Forman (Old Forester)',
    country: 'United States',
    region: 'Louisville, Kentucky',
    founded_year: 1870,
    description:
      'The first bourbon sold exclusively in sealed bottles. Brown-Forman remains one of the very few distillers that makes its own barrels.',
  },
  {
    name: 'Heaven Hill',
    country: 'United States',
    region: 'Bardstown, Kentucky',
    founded_year: 1935,
    description:
      'The largest family-owned and independent spirits producer in the United States, and the steward of the bottled-in-bond category.',
  },
  {
    name: 'WhistlePig',
    country: 'United States',
    region: 'Shoreham, Vermont',
    founded_year: 2007,
    description:
      'A former dairy farm turned rye specialist, now growing estate rye and coopering barrels from its own Vermont oak.',
  },
  {
    name: 'Michter\'s',
    country: 'United States',
    region: 'Louisville, Kentucky',
    description:
      'Revived name of a historic Pennsylvania distillery. Notable for heat-cycled warehousing and unusually low barrel entry proof.',
  },
  {
    name: 'Balcones Distilling',
    country: 'United States',
    region: 'Waco, Texas',
    founded_year: 2008,
    description:
      'Texas pioneer working roasted blue corn and enduring extreme rickhouse temperature swings that drive very fast maturation.',
  },
  {
    name: 'Westward Whiskey',
    country: 'United States',
    region: 'Portland, Oregon',
    founded_year: 2004,
    description:
      'Builds American single malt on a Pacific Northwest ale template — two-row barley, ale yeast, and a slow, cool pot distillation.',
  },
  {
    name: 'Nikka Whisky',
    country: 'Japan',
    region: 'Hokkaido & Miyagi',
    founded_year: 1934,
    description:
      'Founded by Masataka Taketsuru after he studied chemistry and distilling in Scotland. Yoichi still uses direct coal-fired pot stills.',
  },
  {
    name: 'Suntory',
    country: 'Japan',
    region: 'Osaka & Yamanashi',
    founded_year: 1923,
    description:
      "Japan's first whisky distillery at Yamazaki, sited where three rivers meet for its water, and a pioneer of mizunara oak maturation.",
  },
  {
    name: 'Lagavulin',
    country: 'Scotland',
    region: 'Islay',
    founded_year: 1816,
    description:
      'Islay distillery with famously slow distillation and long fermentation, producing a heavily peated spirit of unusual depth.',
  },
  {
    name: 'Springbank',
    country: 'Scotland',
    region: 'Campbeltown',
    founded_year: 1828,
    description:
      'The only Scottish distillery to malt, distil, mature, and bottle entirely on site, and still floor-malts 100% of its barley.',
  },
  {
    name: 'Glenfarclas',
    country: 'Scotland',
    region: 'Speyside',
    founded_year: 1836,
    description:
      'Family owned by six generations of Grants, with the largest stills in Speyside, direct gas firing, and a devotion to sherry casks.',
  },
  {
    name: 'Irish Distillers (Midleton)',
    country: 'Ireland',
    region: 'County Cork',
    founded_year: 1825,
    description:
      'Home of single pot still Irish whiskey — a mixed mash of malted and unmalted barley, triple distilled in enormous copper pot stills.',
  },
  {
    name: 'Teeling Whiskey',
    country: 'Ireland',
    region: 'Dublin',
    founded_year: 2015,
    description:
      'The first new distillery in Dublin in over 125 years, known for aggressive cask experimentation.',
  },
  {
    name: 'Amrut Distilleries',
    country: 'India',
    region: 'Bangalore',
    founded_year: 1948,
    description:
      'Matures at 900m elevation in a tropical climate, losing far more to the angels each year than any Scottish distillery would.',
  },
  {
    name: 'Kavalan',
    country: 'Taiwan',
    region: 'Yilan',
    founded_year: 2005,
    description:
      'Subtropical distillery whose extreme heat produces very rapid maturation and an angel\'s share that can exceed 15% a year.',
  },

  // --- Gin, shochu ----------------------------------------------------------
  {
    name: 'Tanqueray',
    country: 'England',
    region: 'Cameron Bridge, Scotland',
    founded_year: 1830,
    description:
      'Charles Tanqueray\'s house, now distilling in Fife. Tanqueray No. TEN is made in a small still nicknamed "Tiny Ten" using whole fresh citrus.',
  },
  {
    name: 'Sipsmith',
    country: 'England',
    region: 'London',
    founded_year: 2009,
    description:
      'The first copper-pot gin distillery to open in London in nearly 200 years, after a two-year fight to obtain a licence.',
  },
  {
    name: 'Monkey 47',
    country: 'Germany',
    region: 'Black Forest',
    founded_year: 2010,
    description:
      'Forty-seven botanicals, a quarter of them from the Black Forest itself, macerated then rested in earthenware before bottling.',
  },
  {
    name: 'Hayman\'s of London',
    country: 'England',
    region: 'London',
    founded_year: 1863,
    description:
      'Five generations of the same family, and the producer most responsible for bringing Old Tom gin back from extinction.',
  },
  {
    name: 'Iichiko (Sanwa Shurui)',
    country: 'Japan',
    region: 'Ōita',
    founded_year: 1958,
    description:
      "Ōita's barley shochu house, working two-row barley and white koji with both vacuum and atmospheric distillation.",
  },
  {
    name: 'Nankai',
    country: 'Japan',
    region: 'Amami Islands',
    description:
      'Kokuto shochu made from Amami brown sugar and rice koji — a style legally permitted only on the Amami islands.',
  },

  // --- Agave ----------------------------------------------------------------
  {
    name: 'Del Maguey',
    country: 'Mexico',
    region: 'Oaxaca',
    founded_year: 1995,
    description:
      'Ron Cooper\'s single-village project, which did more than any other to establish that mezcal is a category of places rather than a flavour.',
  },
  {
    name: 'Rey Campero',
    country: 'Mexico',
    region: 'Candelaria Yegolé, Oaxaca',
    description:
      'Romulo Sanchez Parada\'s palenque, working a wide range of wild agave from the Sola de Vega and Yegolé areas.',
  },
  {
    name: 'Mezcal Vago',
    country: 'Mexico',
    region: 'Oaxaca',
    founded_year: 2013,
    description:
      'Producer-forward bottlings that name the mezcalero on the label, including Aquilino García\'s clay-pot distillations.',
  },
  {
    name: 'Tequila Fortaleza',
    country: 'Mexico',
    region: 'Tequila, Jalisco',
    founded_year: 1873,
    description:
      'Guillermo Sauza\'s restoration of his family\'s original distillery, using a stone tahona, brick ovens, and open wooden fermenters.',
  },
  {
    name: 'Destilería El Pandillo (G4)',
    country: 'Mexico',
    region: 'Jesús María, Jalisco',
    founded_year: 2011,
    description:
      'Felipe Camarena\'s highlands distillery, which ferments with a mix of rainwater and deep well water and uses a purpose-built "Frankenstein" roller mill.',
  },
  {
    name: 'Tequila Tapatio',
    country: 'Mexico',
    region: 'Arandas, Jalisco',
    founded_year: 1937,
    description:
      'The Camarena family\'s own label from La Alteña, made with brick-oven cooking and a portion of tahona-crushed agave.',
  },
  {
    name: 'Sotol Por Siempre',
    country: 'Mexico',
    region: 'Chihuahua',
    description:
      'Wild-harvested Dasylirion from the Chihuahuan desert, cooked in earthen pits and distilled in small copper alembics.',
  },

  // --- Brandy ---------------------------------------------------------------
  {
    name: 'Maison Ferrand',
    country: 'France',
    region: 'Grande Champagne, Cognac',
    founded_year: 1989,
    description:
      'Alexandre Gabriel\'s house, best known for the 1840 Original Formula built specifically for cocktails at a historically accurate strength.',
  },
  {
    name: 'Frapin',
    country: 'France',
    region: 'Grande Champagne, Cognac',
    founded_year: 1270,
    description:
      'Twenty-one generations of the same family, and one of very few cognac houses that grows, distils, ages, and bottles entirely from its own estate.',
  },
  {
    name: 'Château du Tariquet',
    country: 'France',
    region: 'Bas-Armagnac',
    founded_year: 1912,
    description:
      'Bas-Armagnac estate on sandy fauve soils, distilling on a continuous alambic armagnacais and ageing in local black oak.',
  },
  {
    name: 'Domaine Darroze',
    country: 'France',
    region: 'Bas-Armagnac',
    founded_year: 1974,
    description:
      'A négociant that buys and matures single-estate armagnacs, bottling them by vintage and by farm rather than blending them away.',
  },
  {
    name: 'Massenez',
    country: 'France',
    region: 'Alsace',
    founded_year: 1870,
    description:
      'Alsatian eaux-de-vie house, credited with the first commercial framboise, working enormous quantities of fruit per bottle.',
  },
  {
    name: 'Clear Creek Distillery',
    country: 'United States',
    region: 'Portland, Oregon',
    founded_year: 1985,
    description:
      'Steve McCarthy\'s Oregon distillery, applying Alsatian technique to Pacific Northwest orchard fruit.',
  },

  // --- Liqueur, amaro, aperitivo, fortified ---------------------------------
  {
    name: 'Luxardo',
    country: 'Italy',
    region: 'Torreglia, Veneto',
    founded_year: 1821,
    description:
      'Grows its own Marasca cherries, and distils the fruit, stems, leaves, and pits together before a long ageing in Finnish ash vats.',
  },
  {
    name: 'Chartreuse',
    country: 'France',
    region: 'Voiron, Isère',
    founded_year: 1737,
    description:
      'Made by Carthusian monks from a 1605 manuscript. Only two monks know the full recipe of 130 botanicals at any one time.',
  },
  {
    name: 'Cointreau',
    country: 'France',
    region: 'Angers',
    founded_year: 1849,
    description:
      'A triple sec built from sweet and bitter orange peels distilled separately in copper pots, then blended.',
  },
  {
    name: 'Giffard',
    country: 'France',
    region: 'Angers',
    founded_year: 1885,
    description:
      'Fourth-generation family liqueur house that began with a pharmacist\'s mint cordial and now supplies bars worldwide.',
  },
  {
    name: 'Rothman & Winter',
    country: 'Austria',
    region: 'Vorarlberg',
    description:
      'Austrian fruit liqueurs built on eau-de-vie rather than neutral spirit, giving markedly more fruit definition.',
  },
  {
    name: 'Fratelli Branca',
    country: 'Italy',
    region: 'Milan',
    founded_year: 1845,
    description:
      'Maker of Fernet-Branca to Bernardino Branca\'s original recipe, still aged in Slavonian oak for a full year.',
  },
  {
    name: 'Nonino',
    country: 'Italy',
    region: 'Percoto, Friuli',
    founded_year: 1897,
    description:
      'The distillery that invented single-varietal grappa in 1973, and builds its amaro on a grappa base rather than neutral spirit.',
  },
  {
    name: 'Campari Group',
    country: 'Italy',
    region: 'Milan',
    founded_year: 1860,
    description:
      'Gaspare Campari\'s bitter, whose recipe has never been published and which switched from carmine to synthetic colouring in 2006.',
  },
  {
    name: 'Barbieri (Aperol)',
    country: 'Italy',
    region: 'Padua',
    founded_year: 1919,
    description:
      'Created by the Barbieri brothers and launched at the Padua International Fair — low strength by design, for daytime drinking.',
  },
  {
    name: 'Distilleria Pilzer (Sfumato)',
    country: 'Italy',
    region: 'Trentino',
    description:
      'Producer of Sfumato Rabarbaro for Cappelletti, built on smoked Chinese rhubarb root grown in the Alps.',
  },
  {
    name: 'Peloritana (Braulio)',
    country: 'Italy',
    region: 'Bormio, Valtellina',
    founded_year: 1875,
    description:
      'Alpine amaro created by a Bormio pharmacist, aged in Slavonian oak barrels in cellars at 1,225 metres.',
  },
  {
    name: 'Carpano',
    country: 'Italy',
    region: 'Turin',
    founded_year: 1786,
    description:
      'Antonio Benedetto Carpano invented vermouth as we know it here. Antica Formula is a reconstruction of that original recipe.',
  },
  {
    name: 'Dolin',
    country: 'France',
    region: 'Chambéry',
    founded_year: 1821,
    description:
      'The only vermouth with an appellation — Vermouth de Chambéry — built on alpine botanicals and a notably light hand.',
  },
  {
    name: 'Bodegas Lustau',
    country: 'Spain',
    region: 'Jerez de la Frontera',
    founded_year: 1896,
    description:
      'Sherry house known for the Almacenista programme, bottling tiny soleras from private stockholders under their own names.',
  },
  {
    name: 'Cocchi',
    country: 'Italy',
    region: 'Cocconato, Piedmont',
    founded_year: 1891,
    description:
      'Giulio Cocchi\'s house, whose Americano is a cinchona-forward aperitivo built on Moscato d\'Asti wine.',
  },
  {
    name: 'Taylor Fladgate',
    country: 'Portugal',
    region: 'Douro Valley',
    founded_year: 1692,
    description:
      'One of the oldest port houses, still independent and family-run, with its own quintas at the heart of the Douro.',
  },

  // --- Beer & wine ----------------------------------------------------------
  {
    name: 'Brasserie Cantillon',
    country: 'Belgium',
    region: 'Brussels',
    founded_year: 1900,
    description:
      'Working lambic brewery and museum, still spontaneously fermenting in an open coolship in the Brussels attic air.',
  },
  {
    name: 'Brouwerij Rodenbach',
    country: 'Belgium',
    region: 'Roeselare',
    founded_year: 1821,
    description:
      'Flanders red ale matured in nearly 300 standing oak foeders, some more than 150 years old.',
  },
  {
    name: 'Half Acre Beer Company',
    country: 'United States',
    region: 'Chicago, Illinois',
    founded_year: 2006,
    description:
      'Chicago brewery whose Daisy Cutter helped define the American pale ale of the last two decades.',
  },
  {
    name: 'Pilsner Urquell',
    country: 'Czech Republic',
    region: 'Plzeň',
    founded_year: 1842,
    description:
      'The original pale lager. Still triple decoction mashed, and still fermented in open pitch-lined oak barrels for its museum batches.',
  },
  {
    name: 'Domaine Tempier',
    country: 'France',
    region: 'Bandol, Provence',
    founded_year: 1834,
    description:
      'The estate that made Bandol famous, farming old-vine Mourvèdre on limestone terraces above the Mediterranean.',
  },
  {
    name: 'Pierre Péters',
    country: 'France',
    region: 'Le Mesnil-sur-Oger, Champagne',
    founded_year: 1919,
    description:
      'Grower-producer in the Côte des Blancs, working grand cru Chardonnay and a perpetual reserve begun in 1988.',
  },
  {
    name: 'Ridge Vineyards',
    country: 'United States',
    region: 'Santa Cruz Mountains, California',
    founded_year: 1962,
    description:
      'Pre-eminent California producer, listing full ingredient disclosure on every label since 2011 — still a rarity in wine.',
  },
  {
    name: 'Giuseppe Rinaldi',
    country: 'Italy',
    region: 'Barolo, Piedmont',
    founded_year: 1890,
    description:
      'Traditionalist Barolo house, long led by Beppe Rinaldi and now by his daughters, farming Brunate and Tre Tini.',
  },
]
