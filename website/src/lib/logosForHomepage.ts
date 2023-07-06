const logos = [
  {
    name: 'amazon',
    tlds: ['products', 'prices', 'ecommerce', 'data'],
    src: require('@/assets/homepage-logos/amazon.svg'),
  },
  {
    name: 'airbnb',
    tlds: [],
    src: require('@/assets/homepage-logos/airbnb.svg'),
  },
  {
    name: 'alibaba',
    tlds: [],
    src: require('@/assets/homepage-logos/alibaba.svg'),
  },
  {
    name: 'allrecipes',
    tlds: [],
    src: require('@/assets/homepage-logos/allrecipes.svg'),
  },
  // {
  //   name: 'accuweather',
  //   tlds: [],
  //   src: require('@/assets/homepage-logos/accuweather.svg'),
  // },
  {
    name: 'autotrader',
    tlds: [],
    src: require('@/assets/homepage-logos/autotrader.svg'),
  },
  {
    name: 'barnesnoble',
    tlds: [],
    src: require('@/assets/homepage-logos/barnesnoble.svg'),
  },
  {
    name: 'bing',
    tlds: [],
    src: require('@/assets/homepage-logos/bing.svg'),
  },
  {
    name: 'bloomberg',
    tlds: [],
    src: require('@/assets/homepage-logos/bloomberg.svg'),
  },
  {
    name: 'booking',
    tlds: [],
    src: require('@/assets/homepage-logos/booking.svg'),
  },
  {
    name: 'buzzfeed',
    tlds: [],
    src: require('@/assets/homepage-logos/buzzfeed.svg'),
  },
  {
    name: 'cbssports',
    tlds: [],
    src: require('@/assets/homepage-logos/cbssports.svg'),
  },
  {
    name: 'cnn',
    tlds: [],
    src: require('@/assets/homepage-logos/cnn.svg'),
  },
  {
    name: 'craigslist',
    tlds: [],
    src: require('@/assets/homepage-logos/craigslist.svg'),
  },
  {
    name: 'dribble',
    tlds: [],
    src: require('@/assets/homepage-logos/dribble.svg'),
  },
  {
    name: 'ebay',
    tlds: [],
    src: require('@/assets/homepage-logos/ebay.svg'),
  },
  {
    name: 'espn',
    tlds: [],
    src: require('@/assets/homepage-logos/espn.svg'),
  },
  {
    name: 'etsy',
    tlds: [],
    src: require('@/assets/homepage-logos/etsy.svg'),
  },
  {
    name: 'eventbrite',
    tlds: [],
    src: require('@/assets/homepage-logos/eventbrite.svg'),
  },
  {
    name: 'expedia',
    tlds: [],
    src: require('@/assets/homepage-logos/expedia.svg'),
  },
  {
    name: 'facebook',
    tlds: [],
    src: require('@/assets/homepage-logos/facebook.svg'),
  },
  {
    name: 'fortune',
    tlds: [],
    src: require('@/assets/homepage-logos/fortune.svg'),
  },
  {
    name: 'glassdoor',
    tlds: [],
    src: require('@/assets/homepage-logos/glassdoor.svg'),
  },
  {
    name: 'google',
    tlds: [],
    src: require('@/assets/homepage-logos/google.svg'),
  },
  {
    name: 'hubspot',
    tlds: [],
    src: require('@/assets/homepage-logos/hubspot.svg'),
  },
  {
    name: 'indeed',
    tlds: [],
    src: require('@/assets/homepage-logos/indeed.svg'),
  },
  {
    name: 'instagram',
    tlds: [],
    src: require('@/assets/homepage-logos/instagram.svg'),
  },
  {
    name: 'kayak',
    tlds: [],
    src: require('@/assets/homepage-logos/kayak.svg'),
  },
  // {
  //   name: 'kickstarter',
  //   tlds: [],
  //   src: require('@/assets/homepage-logos/kickstarter.svg'),
  // },
  {
    name: 'linkedin',
    tlds: [],
    src: require('@/assets/homepage-logos/linkedin.svg'),
  },
  {
    name: 'medium',
    tlds: [],
    src: require('@/assets/homepage-logos/medium.svg'),
  },
  {
    name: 'monster',
    tlds: [],
    src: require('@/assets/homepage-logos/monster.svg'),
  },
  {
    name: 'motleyfool',
    tlds: [],
    src: require('@/assets/homepage-logos/motleyfool.svg'),
  },
  {
    name: 'nextdoor',
    tlds: [],
    src: require('@/assets/homepage-logos/nextdoor.svg'),
  },
  {
    name: 'indeed',
    tlds: [],
    src: require('@/assets/homepage-logos/indeed.svg'),
  },
  {
    name: 'priceline',
    tlds: [],
    src: require('@/assets/homepage-logos/priceline.svg'),
  },
  {
    name: 'quora',
    tlds: [],
    src: require('@/assets/homepage-logos/quora.svg'),
  },
  {
    name: 'reddit',
    tlds: [],
    src: require('@/assets/homepage-logos/reddit.svg'),
  },
  {
    name: 'reuters',
    tlds: [],
    src: require('@/assets/homepage-logos/reuters.svg'),
  },
  {
    name: 'stackoverflow',
    tlds: [],
    src: require('@/assets/homepage-logos/stackoverflow.svg'),
  },
  {
    name: 'ticketmaster',
    tlds: [],
    src: require('@/assets/homepage-logos/ticketmaster.svg'),
  },
  {
    name: 'tumblr',
    tlds: [],
    src: require('@/assets/homepage-logos/tumblr.svg'),
  },
  {
    name: 'twitter',
    tlds: [],
    src: require('@/assets/homepage-logos/twitter.svg'),
  },
  {
    name: 'upwork',
    tlds: [],
    src: require('@/assets/homepage-logos/upwork.svg'),
  },
  {
    name: 'walmart',
    tlds: [],
    src: require('@/assets/homepage-logos/walmart.svg'),
  },
  {
    name: 'wikipedia',
    tlds: [],
    src: require('@/assets/homepage-logos/wikipedia.svg'),
  },
  {
    name: 'yahoo',
    tlds: [],
    src: require('@/assets/homepage-logos/yahoo.svg'),
  },
  {
    name: 'yelp',
    tlds: [],
    src: require('@/assets/homepage-logos/yelp.svg'),
  },
  {
    name: 'youtube',
    tlds: [],
    src: require('@/assets/homepage-logos/youtube.svg'),
  },
  {
    name: 'zillow',
    tlds: [],
    src: require('@/assets/homepage-logos/zillow.svg'),
  },
  {
    name: 'booking',
    tlds: [],
    src: require('@/assets/homepage-logos/booking.svg'),
  },
  {
    name: 'allrecipes',
    tlds: [],
    src: require('@/assets/homepage-logos/allrecipes.svg'),
  },
  {
    name: 'linkedin',
    tlds: [],
    src: require('@/assets/homepage-logos/linkedin.svg'),
  },
];

let logoIndex = 0;

export default function getLogo() {
  if (logoIndex >= logos.length) {
    logoIndex = 0;
  }
  return { ...logos[logoIndex++] };
}