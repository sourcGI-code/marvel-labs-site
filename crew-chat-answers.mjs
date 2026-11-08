// Approved concept facts, not generated answers or connected machine readings.
// Prefer an explicit unknown to inventing a specification, delivery date or return.
const topics = [
  {id:'value', terms:['good trailer','good','worth','benefit','why','different','advantage','convince','better','special'], answer:[
    'For a landscaping crew, the appeal is that one trailer could do more for the business: carry your existing equipment, turn collected grass into products, and connect the work to an app that shows what was made, what sold and what you actually earned.',
    'You keep your mowers and tools. Marvel’s proposed package brings the factory, production supplies, product buyers and business software together around the route you already run.',
    'The right choice starts with your equipment. Are you hauling one mower and hand tools, or a larger setup?'
  ], next:['One mower and hand tools','A larger equipment setup']},
  {id:'compact-fit', terms:['one mower','single mower','small crew','solo','compact setup'], answer:[
    'I’d start by looking at the 16 ft. Its 7 ft width and smaller overall footprint make it the compact option, with the same front factory concept as the 20 ft.',
    'The important check is your mower’s deck width and the room needed for tools, access and loading. A smaller footprint is useful only if your equipment fits comfortably.',
    'Would you like to compare the Buy and Lease plans, or see the 16 ft reservation options?'
  ], next:['Compare Buy and Lease','Explore the 16 ft'], action:{label:'Explore the 16 ft',href:'trailer-16.html'}},
  {id:'large-fit', terms:['larger equipment','larger setup','two mowers','2 mowers','multiple mowers','big crew','large crew','more equipment'], answer:[
    'The 20 ft is the option to explore for more equipment room. It is 8.5 ft wide, with a larger rear equipment area and the same front factory concept.',
    'We’d still need to confirm your equipment dimensions, loaded weight and tow vehicle before calling it the right fit. More space should support your working day, not make loading harder.',
    'Want to see the 20 ft, or compare how the Buy and Lease plans work?'
  ], next:['Explore the 20 ft','Compare Buy and Lease'], action:{label:'Explore the 20 ft',href:'trailer-20.html'}},
  {id:'plans', terms:['compare buy','buy or lease','buy and lease','which plan','two plans'], answer:[
    'Buy is designed for an owner who wants the larger share of product profit: the operator keeps 75%, with Marvel receiving 25%. Preview purchase prices are $44,999 for the 16 ft and $49,999 for the 20 ft.',
    'The proposed Lease plan removes the upfront trailer purchase. The operator receives 25% of product profit and Marvel receives 75%. Monthly lease charges, duration, maintenance, insurance and return obligations still need to be confirmed in the final written agreement.',
    'Which matters more for your business: keeping upfront spending down, or keeping the larger share of product profit?'
  ], next:['Keep upfront spending down','Keep the larger profit share']},
  {id:'lease-fit', terms:['upfront spending down','lower upfront','no upfront','dont have money','cant afford','too expensive'], answer:[
    'Then the proposed Lease plan is the one to look at first. It is intended to let a crew use the trailer without buying it upfront, while earning 25% of product profit.',
    'That does not mean every operating cost disappears. The final agreement needs to explain supplies, shipping, maintenance and how profit is calculated so you can judge the full cost.',
    'We can compare trailer sizes next, or you can explore the reservation options.'
  ], next:['Compare the trailer sizes','How does the reservation work?'], action:{label:'Explore reservation options',href:'reserve.html'}},
  {id:'buy-fit', terms:['larger profit share','higher share','buy outright','purchase outright','keep more profit'], answer:[
    'Then Buy is the plan to compare: you would keep 75% of product profit. It is aimed at an owner who prefers the upfront purchase in exchange for that larger share.',
    'The next decision is equipment space: 16 ft × 7 ft, or 20 ft × 8.5 ft. Both use the same front factory concept.',
    'Would the compact trailer fit your crew, or do you need the larger equipment bay?'
  ], next:['One mower and hand tools','A larger equipment setup']},
  {id:'quality', terms:['durable','build quality','construction','reliable','reliability','warranty','safe','safety','heavy duty'], answer:[
    'A good work trailer has to earn its place on the route: practical loading, usable equipment space, suitable payload and towing limits, and dependable access for cleaning and service.',
    'Those are the things to verify on the physical build. The render alone cannot prove durability or reliability, and final ratings, warranty and validation results are pending validation and final specifications.',
    'Tell me what equipment you carry, and I can help narrow down which layout is worth exploring first.'
  ], next:['One mower and hand tools','A larger equipment setup']},
  {id:'skepticism', terms:['scam','too good','sounds fake','believe','proof','proven','skeptic','legit'], answer:[
    'It is reasonable to want proof before committing. The idea is compelling because it connects the grass crews already collect with product buyers and a factory that travels with their equipment.',
    'What will make it a sound business decision is measured production cost, repeatable product quality, dependable orders and clear operating terms. Those need physical validation; the website is a preview of the intended experience.',
    'We can still work out whether the layout and proposed profit-sharing model make sense for your crew.'
  ], next:['Compare the trailer sizes','Compare Buy and Lease']},
  {id:'marketing', terms:['marketing','market my','social','caption','advertis','before and after','post'], answer:[
    'Your next customer could start with the job you just finished. The planned marketing agent would turn available camera footage and before-and-after photos into content carrying your business’s name.',
    'Think branded clips, captions and a booking link, prepared for your review. An inquiry could then move into your Marvel inbox, quote and schedule, helping connect the marketing to actual work.',
    'It is a planned feature, not a live publishing service in this demo. Would marketing support or keeping track of earnings help your business more right now?'
  ], next:['What else is in the app?','What does Marvel supply?']},
  {id:'earnings', terms:['earn','profit','income','money','paid','payout','sold','sell','revenue','50','75','25'], answer:[
    'The proposed Buy plan gives the operator 75% of product profit; Marvel receives 25%. Under the proposed no-upfront-purchase lease, the operator receives 25% and Marvel receives 75%. These are shares of profit, not the selling price.',
    'The app should show products made, products sold, your calculated share and money actually paid as separate numbers. Costs and the agreed profit calculation must be defined before any earnings can be promised.',
    'The initial sink has a target selling price of $50. Production costs, sales volume and returns are still being validated.'
  ], next:['Who buys the products?','What does Marvel supply?']},
  {id:'supplies', terms:['suppl','provided','provide','included','ingredients','packaging','materials','mowers','tools','bring my'], answer:[
    'Crews bring their existing mowers, trimmers and tools. Marvel supplies the trailer and is planning the production ingredients, packaging, shipping labels, software and trailer support around it.',
    'The goal is one connected workflow: do the landscaping job, load suitable collected material, collect the packaged products and take them to UPS. Supply costs and replenishment terms belong in the final operating agreement.'
  ], next:['How does the trailer work?','Who buys the products?']},
  {id:'buyers', terms:['who buys','buyer','offtake','demand','find customers','purchase products'], answer:[
    'Marvel’s role is to arrange the companies buying finished products, so the landscaper can focus on their route and loading the trailer.',
    'The app is intended to connect a production batch to quality checks, a buyer order, shipping and the operator’s share of profit. Buyer interest is not the same as a completed sale or guaranteed demand.'
  ], next:['What do I actually earn?','How do packages get shipped?']},
  {id:'shipping', terms:['ups','shipping','shipped','drop off','drop-off','package exit','collect packages','carton'], answer:[
    'The planned workflow packages and stores finished products onboard. The crew retrieves them through the package exit and takes the labeled packages to a UPS Store.',
    'Marvel is planning to supply the packaging and shipping arrangements. The app would show what is ready, what shipped and what sold; this chat cannot book a shipment.'
  ], next:['What does Marvel supply?','What do I actually earn?']},
  {id:'sizes', terms:['16','20ft','20 ft','20 foot','size','dimension','width','cargo','footprint','factory length','six foot','6 foot'], answer:[
    'The two proposed trailer footprints are 16 ft × 7 ft and 20 ft × 8.5 ft. Both use the same nominal six-foot front factory; the larger trailer leaves more equipment room.',
    'The current design shows a 6 ft 2½ in factory after the approved partition adjustment. Final usable clearances and the equipment layout need verification against the physical trailer.'
  ], next:['How much does the trailer cost?','What does Marvel supply?']},
  {id:'pricing', terms:['cost','price','buy','lease','free','purchase','upfront'], answer:[
    'Current website preview prices are $44,999 for the 16 ft trailer and $49,999 for the 20 ft trailer. The proposed lease avoids an upfront trailer purchase and uses a different product-profit split.',
    'Pricing, supplier economics, operating costs and lease terms are still being finalized. Reservations are open through Shopify for a one-time $100 USD fully refundable deposit. It is not the trailer price or a monthly lease payment.'
  ], next:['What do I actually earn?','How does the reservation work?']},
  {id:'reservation', terms:['reserv','deposit','refundable','refund','pay','checkout','order now','100'], answer:[
    'The reservation is a one-time, fully refundable $100 USD deposit paid through Shopify. For a purchased trailer, it is intended to count toward the final price, subject to the final agreement.',
    'Checkout is live. Shopify confirms the order after successful payment; no remaining balance is charged automatically. To change or cancel a reservation, contact jaxon@marvellabs.com with your Shopify order number. Final purchase and lease terms are separate.'
  ], next:['How much does the trailer cost?','Is the factory ready?']},
  {id:'production', terms:['how does','how it work','process','grass','leaves','waste','production','sink','manufactur','factory work'], answer:[
    'The goal is an autonomous microfactory inside the trailer’s front factory area: prepare the collected grass, dose and mix the recipe, form the product, complete any required curing, check quality, then package and store it.',
    'Vision and machine learning would monitor the process, with robotic arms planned across three production areas. Crews continue landscaping with their existing equipment.',
    'The first proposed product is a 20 × 20 in sink. The material recipe, equipment layout and reliable full production cycle are still being developed.'
  ], next:['What does Marvel supply?','What do I actually earn?']},
  {id:'robotics', terms:['robot','arms','vision','machine learning','autonom','local computing','edge','aws'], answer:[
    'The plan combines machine vision, ML and coordinated robotic arms across three production areas. Local computing would observe process stages, product counts and visible defects while machine controls handle the sequence.',
    'The trailer must be designed to stop safely when something is wrong. Internet access should not be required for local control; the connected platform can sync records and support remote monitoring.',
    'This is the architecture being developed, not a claim that an unattended production system is already proven.'
  ], next:['How does the trailer work?','Can I track trailers on a map?']},
  {id:'location', terms:['rtk','gps','map','location','localization','track trailer','fleet'], answer:[
    'The plan is to show trailers and crews on a fleet map, with RTK/GNSS providing trailer position where supported.',
    'The app should distinguish a fresh location from an old or unavailable fix. RTK availability and accuracy depend on the installed receiver, corrections and operating conditions. This preview has no live location feed.'
  ], next:['What else is in the app?','How do the robots work?']},
  {id:'status', terms:['battery','error','fault','red light','green light','camera','ready package','status','downtime','maintenance'], answer:[
    'The app is intended to show battery level, trailer red/green status, informative errors, production counts and a storage-camera view of ready packages.',
    'This website uses example data and has no connection to a working trailer. I cannot verify a current battery reading, clear an error or operate equipment. A real fault needs the approved diagnostic and service procedure.'
  ], next:['What else is in the app?','Is the factory ready?']},
  {id:'app', terms:['app','assistant','chatbot','quote','schedule','calendar','employee','inbox','customer history','team'], answer:[
    'Marvel Crew is intended to bring trailer operations and the landscaping business together: status, cameras, production, earnings, quotes, customer records, crew access, a fleet map, scheduling and inbox.',
    'An assistant would help owners understand records and find their next action. A separate planned marketing agent would help turn job footage into content for review.',
    'The website phone is an interactive demo. Connected accounts, real telemetry and autonomous agent actions are not live here.'
  ], next:['How could the marketing agent help my crew?','What do I actually earn?']},
  {id:'readiness', terms:['ready','launch','delivery','available','when','built','prototype','working','guarantee'], answer:[
    'The physical microfactory is still in development. The grass-to-product process, full-size product validation, equipment integration and operating economics need to be proven.',
    'The website shows the intended experience. A confirmed delivery date, production rate or commercial readiness cannot be established from this demo.'
  ], next:['How does the trailer work?','How does the reservation work?']},
  {id:'demo', terms:['real ai','language model','chatgpt','gpt','preset','are you ai','are you real','private','privacy','save my'], answer:[
    'This is a guided website demo with preset answers based on Marvel’s current trailer plan. It is not connected to an AI model, a customer account or a live trailer.',
    'Messages stay in this page’s memory and disappear when you reload. They are not sent to a chat service. The planned app assistant will need a connected backend and appropriate account permissions.'
  ], next:['How does the trailer work?','What else is in the app?']}
];

export function answerQuestion(question, context = {}) {
  const query = question.toLowerCase().replace(/[’']/g, '').replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  // Specific intents beat broad words such as "app", "trailer" and "price".
  if (/^(yes|yeah|yep|sure|ok|okay|tell me more|go on|sounds good)[ .!]*$/.test(query) && context.lastTopic) {
    const next = {value:'sizes', 'compact-fit':'plans', 'large-fit':'plans', plans:'pricing', marketing:'app', earnings:'plans', buyers:'earnings', production:'value', supplies:'value'}[context.lastTopic] || 'sizes';
    return topics.find(t => t.id === next);
  }
  const exact = [
    [/\b(explore|want|choose|show|see) (the )?16\s*(ft|foot)/, 'compact-fit'],
    [/\b(explore|want|choose|show|see) (the )?20\s*(ft|foot)/, 'large-fit'],
    [/\b(one|single) mower|small crew|\bsolo\b/, 'compact-fit'],
    [/larger (equipment|setup)|\b(two|2|multiple) mowers|\b(big|large) crew/, 'large-fit'],
    [/\bupfront spending down|lower upfront|no upfront|cant afford|too expensive/, 'lease-fit'],
    [/larger profit share|higher share|keep more profit|buy outright|purchase outright/, 'buy-fit'],
    [/compare buy|buy (or|and) lease|which plan|two plans/, 'plans'],
    [/\b(durable|reliable|reliability|warranty|safety|heavy duty)|build quality/, 'quality'],
    [/\b(scam|fake|proof|proven|skeptic|legit)|too good/, 'skepticism'],
    [/\b(good|worth|benefits?|different|advantages?|convince|better|special)\b|why.*(buy|choose|trailer)/, 'value'],
    [/\b(marketing|caption|social|advertis)/, 'marketing'],
    [/\b(who buys|buyers?|offtake)\b/, 'buyers'],
    [/\b(what.*suppl|what.*provid|what.*includ)\b/, 'supplies'],
    [/\b(reserv|deposit|refund|checkout)/, 'reservation'],
    [/\b(earn|profit|income|payout)/, 'earnings'],
    [/\b(how much|trailer cost|trailer price)/, 'pricing'],
    [/\b(real ai|are you ai|are you real|chatgpt|language model|privacy|preset)\b/, 'demo'],
    [/\b(is.*ready|when.*ready|delivery date|already built)\b/, 'readiness'],
    [/\b(robot|arms|machine learning)/, 'robotics']
  ];
  let topic;
  for (const [pattern, id] of exact) if (pattern.test(query)) {topic = topics.find(t => t.id === id); break;}
  if (!topic) {
    const ranked = topics.map(t => ({topic:t, score:t.terms.reduce((score, term) => {
      const at = query.indexOf(term);
      return score + (at >= 0 && (at === 0 || /\W/.test(query[at-1])) ? (term.includes(' ') ? 3 : 1) : 0);
    }, 0)})).sort((a,b) => b.score-a.score);
    if (ranked[0].score) topic = ranked[0].topic;
  }
  if (topic) return topic;
  if (/^(hi|hello|hey|thanks|thank you)\b/.test(query)) return {
    id:'hello', answer:['Hi! Ask me about the microfactory trailer, the proposed income model or how Marvel plans to support a landscaping crew.'],
    next:['How does the trailer work?','What do I actually earn?']
  };
  return {
    id:'unknown', answer:["Let’s connect that to what matters for your crew. The trailer’s proposed value has three parts: equipment space, an opportunity to earn from products made with collected grass, and software to run the business.", 'I can help compare those parts, though this preview cannot answer every technical question. Is your main concern the equipment fit, the cost or the extra income?'],
    next:['Compare the trailer sizes','Compare Buy and Lease','What do I actually earn?']
  };
}
