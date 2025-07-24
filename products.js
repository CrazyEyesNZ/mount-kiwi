// Defines the full product hierarchy: types, varieties, colours, and sizes
window.productData = [
  {
    type: 'Jackets',
    varieties: [
      { name: '50 Shades',    colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Alpine',       colours: ['Brown','Charcoal'],             sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Arrowtown',    colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Byron Bay',    colours: ['Black','(65-10) Blue','Grey'],   sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Coronet Peak', colours: ['Blue','Cherry'],                sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Fiordland',    colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Glacier',      colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Koru',         colours: ['Brown','Charcoal','Grey'],      sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Nambassa',     colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Piha',         colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Punakaiki',    colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Raglan Wave',  colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Riverstone',   colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Sherpa',       colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Southern Alps', colours: ['Base'],                       sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Sutherland',   colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Te Anau',      colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Tekapo',       colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Waiouru',      colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Whale Bay',    colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Whistler',     colours: ['Base'],                        sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Shawls',
    varieties: [
      { name: 'Aqua Marine', colours: ['Base'],   sizes: ['One'] },
      { name: 'Black',      colours: ['Base'],   sizes: ['One'] },
      { name: 'Chai',       colours: ['Base'],   sizes: ['One'] },
      { name: 'Charcoal',   colours: ['Base'],   sizes: ['One'] },
      { name: 'Cream',      colours: ['Base'],   sizes: ['One'] },
      { name: 'Forest',     colours: ['Base'],   sizes: ['One'] },
      { name: 'Grey',       colours: ['Base'],   sizes: ['One'] },
      { name: 'Navy',       colours: ['Base'],   sizes: ['One'] },
      { name: 'Natural',    colours: ['Base'],   sizes: ['One'] },
      { name: 'Olive',      colours: ['Base'],   sizes: ['One'] },
      { name: 'Plum',       colours: ['Base'],   sizes: ['One'] },
      { name: 'Rust',       colours: ['Base'],   sizes: ['One'] }
    ]
  },
  {
    type: 'Rain Jacket',
    varieties: [
      { name: 'Rain Jacket', colours: ['Navy/Grey','Maroon/Grey','Green/Grey','Black','Black/Grey','Aqua'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Woodville Stitch',
    varieties: [
      { name: 'Woodville Stitch', colours: ['Black','Blue New','Forest Green','Grey'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Station',
    varieties: [
      { name: 'Station', colours: ['Brown Mix','Char/Brown','Char/Grey','Charcoal','Dark Nat Brown','Grey','Natural Brown'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Coastal',
    varieties: [
      { name: 'Coastal', colours: ['Black','Brown','Charcoal','Dark Natural','Denim','Forest','Grey','Natural Brown','Olive','Orange'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Weekender',
    varieties: [
      { name: 'Weekender', colours: ['50 Shades','Black','Burnt Orange','Charcoal','Cherry','Dark Brown','Forest Green','Natural Brown','Petrol'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Kids Jacket',
    varieties: [
      { name: 'Carnival',     colours: ['Multi'],         sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Lollipop',     colours: ['Mixed'],         sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Wave Rider',   colours: ['Blue','Orange','New Green'], sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Rainbow',      colours: ['Multi'],         sizes: ['S','M','L','XL','XXL','3XL'] },
      { name: 'Jungle',       colours: ['Green'],         sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Vest',
    varieties: [
      { name: 'Vest', colours: ['Charcoal','Black','Forest','Navy'], sizes: ['S','M','L','XL','XXL','3XL'] }
    ]
  },
  {
    type: 'Tonga Beanie',
    varieties: [
      { name: 'Tongariro Beanie', colours: ['Charcoal Grey','Charcoal Black','Charcoal Forest','Charcoal Teal'], sizes: ['One'] }
    ]
  },
  {
    type: 'Koru Beanie',
    varieties: [
      { name: 'Koru Beanie', colours: ['Charcoal'], sizes: ['One'] }
    ]
  },
  {
    type: 'House Socks',
    varieties: [
      { name: 'Alpine', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Arrowtown', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Marshmallow', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Nature', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Nordic', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Rainbow', colours: ['Base'], sizes: ['S/M','L'] },
      { name: 'Wave Rider', colours: ['Base'], sizes: ['S/M','L'] }
    ]
  },
  {
    type: 'Sherpa Beanie',
    varieties: [
      { name: 'Sherpa Beanie', colours: ['Navy Mix'], sizes: ['One'] }
    ]
  }
];