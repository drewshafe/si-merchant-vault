// vault-library.js — shared Next Steps content, the same in every vault (Mosie's "library").
// Edit here and every vault picks it up on next load. Images live in assets/lib/.
// Reviews + examples imported from the Aligned "Overview" template (Oct 2026).
window.MV_LIB = {
  install: [
    // shot: default preview image in the Install panel for this platform (a vault's own upload overrides it)
    { key: 'shopify', label: 'Shopify', color: '#5e8e3e', url: 'https://apps.shopify.com/shipinsure-order-protection', shot: 'install-shopify.jpg', shotLabel: 'View on the Shopify App Store' },
    { key: 'woocommerce', label: 'WooCommerce', color: '#7f54b3', url: 'https://wordpress.org/plugins/shipinsure-for-woocommerce/' },
    { key: 'bigcommerce', label: 'BigCommerce', color: '#121118', url: 'https://login.bigcommerce.com/deep-links/marketplace/apps/27696/?mktid=aWQlM0E5MDQtR1NCLTkwMSUyNnRva2VuJTNBX21jaC1iaWdjb21tZXJjZS5jb20tYzZjMTE3YTdjNTk0NGMwZWUzOGZhYjdlMmE3OWEzOTc%3D' }
  ],

  billing: [
    { key: 'billing', label: 'Billing Explained', url: 'https://drewshafe.github.io/shipinsure-billing/' },
    { key: 'claims', label: 'How a Claim Works', url: 'https://drewshafe.github.io/shipinsure-claims/' }
  ],

  examples: [
    { name: 'Caden Lane', logo: 'cadenlane-wm.jpg', url: 'https://cadenlane.com',
      setup: 'Cart checkout buttons + Checkout remove product', note: 'Our rec for best conversion & higher protected checkout attach',
      cs: 'cadenlane-cs.jpg', csText: 'Apparel, $50M+: 94.7% of orders protected, $242K in claims paid, 3,898 CS hours back, 6-hour median claim close.' },
    { name: '260 Sample Sale', logo: '260samplesale-wm.jpg', url: 'https://260samplesale.com',
      setup: 'Cart buttons + Checkout widget & remove product', note: '',
      cs: '260samplesale-cs.jpg', csText: 'Luxury resale, $50M+: switched from another protection app and got 801 hours a year back.' },
    { name: 'Original Grain', logo: 'originalgrain-wm.jpg', url: 'https://originalgrain.com',
      setup: 'Cart checkout buttons', note: 'Includes “Skip The Line” (priority order fulfillment)',
      cs: 'originalgrain-cs.jpg', csText: 'Watches, $10–50M: $33K paid, 102 hours back on high-value lost shipments.' },
    { name: 'VKTRY', logo: 'vktry2-wm.jpg', url: 'https://vktry.com',
      setup: 'Checkout widget + remove product', note: 'Our rec for best Shop App conversion',
      cs: 'vktry-cs.jpg', csText: 'Footwear, $10–50M: $72K in claims paid, 405 hours back.' }
  ],

  reviews: [
    { name: 'Back to the Future™', logo: 'backtothefuture.jpg', url: 'https://backtothefuture.store',
      quote: "After being with one of ShipInsure's competitors for a few years, we made the switch earlier this year to ShipInsure, which has provided some much needed flexibility and customization capabilities we did not have with our previous solution. They are very attentive to our needs, timely in their response time, and very easy to work with. We are impressed!" },
    { name: 'VKTRY', logo: 'vktry2.jpg', url: 'https://vktry.com',
      quote: "We've had a great experience so far with ShipInsure! Corbin and his team have been excellent through the whole onboarding process and beyond, ensuring our customers are taken care of, and help customizing how we handle certain things. We have also been driving a ton of revenue, really enjoying our partnership!" },
    { name: 'Wrigleyville Sports', logo: 'wrigleyville.jpg', url: 'https://wrigleyvillesports.com',
      quote: 'Awesome shipping protection tool. Seamless integration, great customer experience, and lightning-fast claims resolution. It has saved our team a ton of customer service hours!' },
    { name: 'Vivida Lifestyle', logo: 'vivida.jpg', url: 'https://vividalifestyle.com',
      quote: "It’s been great working with the ShipInsure team to offer this added protection to our customers. The support and communication throughout the launch were excellent, and the team has always been available whenever we’ve had questions.\n\nWhat is amazing too is that it’s genuine insurance: if an order goes missing, there is reimbursement for the product’s full retail value, rather than simply its cost value. Our customers appreciate the added peace of mind, and we also love how the service helps encourage repeat purchases. Highly recommended." },
    { name: "Linda's", logo: 'lindas.jpg', url: 'https://lindas.com',
      quote: "Painless implementation. Claims are processed quickly. Great company and people to work with. Very collaborative and open to feedback that often leads to product enhancements. They don't just tell you they will put something on the roadmap - they deliver!" },
    { name: 'The Oodie', logo: 'theoodie.jpg', url: 'https://theoodie.com',
      quote: 'ShipInsure has been a very easy integration into our existing Shopify setup. The team truly invests time in understanding your business to ensure everything is configured for success. Post integration support has been exceptional, with no questions too difficult - they check in to help us maximise results and explore new opportunities within our markets. Highly recommend for anyone looking to elevate their post sale support experience and customer confidence!' },
    { name: 'Harmony 783', logo: 'harmony783.jpg', url: 'https://harmony783.com',
      quote: 'ShipInsure was very easily integrated into our Shopify platform. There is also excellent support from their team. I especially appreciate that they are open to continuous improvement of their app and take suggestions from the user for a more efficient experience.' },
    { name: 'Morrow Soft Goods', logo: '', url: 'https://morrowsoftgoods.com',
      quote: 'We used another shipping insurance service before and switched to ShipInsure and are delighted with the turn. Our point person is always super responsive and customers rarely reach out to us for additional support with their claims. ShipInsure is responsive and makes us feel valued!' },
    { name: 'HairMax', logo: 'hairmax.jpg', url: 'https://hairmax.com',
      quote: "Fantastic App & Outstanding Support!\n\nWe've been using ShipInsured for 30+ days and it's been a game changer for our Shopify store. The app integrates seamlessly with our existing workflow and provides us with peace of mind by automatically insuring our shipments.\n\nClaims are easy to file and the process is fast—no complicated forms or endless follow-ups. Their customer support team is incredibly responsive and helpful whenever we've had questions.\n\nHighly recommended for any e-commerce business looking to protect shipments and streamline their operations. A must-have tool in our fulfillment process!" },
    { name: 'Ooze', logo: 'ooze.jpg', url: 'https://oozelife.com',
      quote: "We've tried a few shipping insurance providers and this was by far the easiest install. The team is super responsive and we love the dashboard. If you're considering switching this is the easiest tech switch you'll make all year." },
    { name: 'Canna Style', logo: 'cannastyle.jpg', url: 'https://shopcannastyle.com',
      quote: "After vetting several of the top shipping protection platforms, we decided to go with ShipInsure due to the customizable nature of the protection, and it has far surpassed our expectations. Every business is unique, and it only makes sense to get the coverage that matters to your business rather than a one-size-fits-all solution. This is where ShipInsure really stood out. In addition, the team has constantly demonstrated a great partnership at every step, from implementation through ongoing support and issue resolution. What is abundantly clear is their focus on the customers' pain points and needs, which are factored into new features and product launches. David, Noah, Morgan and everyone else with whom we've interacted have been amazingly helpful, and we look forward to our continued partnership. If you're looking for shipping protection and more, I highly recommend giving ShipInsure a go." },
    { name: 'Myster', logo: 'myster.jpg', url: 'https://getmyster.com',
      quote: 'Great customer service and easy to work with!' },
    { name: 'Saratoga Olive Oil', logo: 'saratoga.jpg', url: 'https://saratogaoliveoil.com',
      quote: "The ShipInsure team was WONDERFUL and very helpful when getting the app set up, and prior to as well. They were very detailed and made sure we understood the process as well as how the billing worked. I really enjoy how easy it is for our customers to purchase insurance as well as submit a claim on their own without our help. It is easy for us to file a claim on their behalf if needed.\n\nWe have been hoping to use this program for over 2 years now, and now that it has been implemented we couldn't be happier!\n\n-Easy to use\n-Easy to understand\n-Easy for customers\n-Affordable\n-Quick friendly help from the team if needed" },
    { name: 'White Oak Pastures', logo: 'whiteoak.jpg', url: 'https://whiteoakpastures.com',
      quote: 'We have enjoyed working with the ShipInsure team to offer this protection for our customers! They offered great support and communication as we were getting launched and have been available anytime we have a question or need support. Our customers appreciate us offering this and feel like they can have peace of mind when they order from our store. We highly recommend ShipInsure!' },
    { name: 'REP Provisions', logo: 'repprovisions.jpg', url: 'https://repprovisions.com',
      quote: 'Super happy so far! Drew and Morgan have been awesome to work with, quick responses and very informative. We launched ShipInsure on our website today and immediately had customers opting in to the shipping protection. We are excited to see how it goes and are hopeful that ShipInsure will take away the need of having to deal with unhappy customers and claims with our carriers.' },
    { name: 'Better Rhodes', logo: 'betterrhodes.jpg', url: 'https://betterrhodes.com',
      quote: 'Amazing for fulfillment, been using them for a year and have had no issues so far.' },
    { name: 'Musclesport', logo: 'musclesport.jpg', url: 'https://musclesport.com',
      quote: "We’ve been extremely pleased with our experience using ShipInsure! The platform is intuitive, reliable, and has streamlined our shipping insurance process in ways we didn’t expect. It’s clear that ShipInsure is designed with both efficiency and user experience in mind, making it a standout solution in the industry.\n\nWe’d especially like to give a big shoutout to Noah for going above and beyond. His attention to detail, responsiveness, and willingness to provide extra support made a significant difference for our team. It's rare to find that level of dedication and customer care, and we truly appreciate it.\n\nOverall, we highly recommend ShipInsure to anyone looking for a seamless, professional, and trustworthy shipping insurance solution. It’s been a great partnership, and we look forward to continuing to work together!" },
    { name: 'Pasturebird', logo: 'pasturebird.jpg', url: 'https://www.pasturebird.com',
      quote: 'We recently switched over to ShipInsure and are incredible happy with this service and support. It ties in seamlessly to our customer service portal as well. And the transition has been wonderful, thanks to Drew and Morgan!' },
    { name: 'EBOOST', logo: 'eboost.jpg', url: 'https://eboost.com',
      quote: 'Can’t say enough good things about ShipInsure. Noah and the team are top-tier, super easy to work with, always on it, and they genuinely care. It’s rare to find a partner that feels like an extension of your team, but that’s exactly what they’ve been for us. Setup was a breeze, support is lightning fast, and it’s been a big win for both our ops and our customers. We’ve had way fewer headaches on the shipping side, and our customers love having that extra layer of protection. If you’re on the fence, just go for it, you’ll be glad you did.' },
    { name: 'Ceramed', logo: 'ceramed.jpg', url: 'https://ceramed.ca',
      quote: 'We’ve had a great experience with ShipInsure. It’s easy to use, reliable, and has helped simplify our shipping process.\n\nOne of the biggest benefits for us is that it has significantly reduced the back-and-forth between our operations team and customers when it comes to shipping issues. It makes the process smoother for everyone and saves our team valuable time.\n\nOverall, we’re very happy with ShipInsure and would definitely recommend it to other businesses.' }
  ]
};
