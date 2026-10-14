const $=s=>document.querySelector(s);
const inr=n=>'₹'+n.toLocaleString('en-IN');
const PMAP=new Map(PRODUCTS.map(p=>[String(p.id),p]));
const P=id=>PMAP.get(String(id));
let cart=JSON.parse(localStorage.getItem('cart')||'{}');
let favs=JSON.parse(localStorage.getItem('favs')||'[]');
let _sv=0;const save=()=>{if(_sv)return;_sv=setTimeout(()=>{_sv=0;try{localStorage.setItem('cart',JSON.stringify(cart));localStorage.setItem('favs',JSON.stringify(favs))}catch(e){}},250)};
addEventListener('pagehide',()=>{try{localStorage.setItem('cart',JSON.stringify(cart));localStorage.setItem('favs',JSON.stringify(favs))}catch(e){}});
const count=()=>Object.values(cart).reduce((a,b)=>a+b,0);
const total=()=>Object.entries(cart).reduce((a,[id,q])=>a+P(id).price*q,0);
const mrpTotal=()=>Object.entries(cart).reduce((a,[id,q])=>a+P(id).mrp*q,0);
const FREE_AT=99;
let user=kv('user',{name:'Kittu',phone:'+91 98765 43210',email:''});
let orders=kv('orders',[]), cash=kv('cash',0), useCash=false, pts=kv('pts',0);
let gifts=kv('gifts',[]), ratings=kv('ratings',{}), suggests=kv('suggests',[]), prefs=kv('prefs',{orders:true,offers:true,news:false});
let payPref=kv('payPref','cod'), redeemed=kv('redeemed',[]);
const timers=[];
const dt=t=>new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const TOTAL_MS=8*60*1000;
const STORE_OFF={lat:.0075,lng:-.006};
function ostatus(o){if(o.cancelled)return {k:'Cancelled',s:-1};const t=Date.now()-o.ts;
  return t>=TOTAL_MS?{k:'Delivered',s:3}:t>90e3?{k:'Out for delivery',s:2}:t>30e3?{k:'Packed',s:1}:{k:'Order placed',s:0}}

function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1500)}

/* components */
function addBtn(p){const q=cart[p.id]||0;
  return q?`<div class="add has" data-id="${p.id}"><button data-act="dec" aria-label="Remove">${ic('minus',14)}</button><span>${q}</span><button data-act="inc" aria-label="Add">${ic('plus',14)}</button></div>`
          :`<button class="add" data-act="inc" data-id="${p.id}" aria-label="Add to cart">${ic('plus',16)}</button>`}
function card(p){const off=p.mrp-p.price;
  return `<div class="pc" data-quick="${p.id}">
   <div class="pi"><img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async" width="132" height="132">${off>0?`<span class="pc-badge">${Math.round(off/p.mrp*100)}% OFF</span>`:''}
     <button class="fav ${favs.includes(p.id)?'on':''}" data-act="fav" data-id="${p.id}" aria-label="Wishlist">${ic('heart',14)}</button>
     <span data-slot="${p.id}">${addBtn(p)}</span></div>
   <div class="price"><span class="pill">${inr(p.price)}</span>${off>0?`<span class="mrp">${inr(p.mrp)}</span>`:''}</div>
   ${off>0?`<div class="off">${inr(off)} OFF</div>`:''}
   <div class="pn">${p.name}</div><div class="pq">${p.qty}</div></div>`}
const pageTop=(t,right='')=>`<div class="top"><button class="ib" data-back aria-label="Back">${ic('back',20)}</button><h1>${t}</h1>${right}</div>`;

/* views */
const views={
home(){
  const by=c=>PRODUCTS.filter(p=>p.cat==c);
  return `<div class="hero"><div class="hero-top"><div>
     <div class="eta">${ic('bolt',18)} 8 minutes</div>
     <button class="addr" data-act="addr">${ic('pin',13)} ${esc(curAddr()?addrShort(curAddr()):'Set delivery location')} ${ic('down',14)}</button></div>
     <button class="avatar" data-go="#/profile" aria-label="Profile">${ic('user',20)}</button></div>
     <button class="search" data-act="search">${ic('search',18)}<span>Search "tomato"</span></button></div>
   <div class="banners">${BANNERS.map(b=>`<img src="${b}" alt="Offer" decoding="async">`).join('')}</div>
   <div class="sec" style="padding-top:4px"><div class="sec-h"><h2>Shop by category</h2><a class="link" href="#/categories">See all ${ic('chev',12)}</a></div>
     <div class="cats">${CATEGORIES.map(c=>`<button class="cat" data-go="#/shop/${c.slug}"><img src="${c.img}" alt="" decoding="async" width="100" height="100"><b>${c.name}</b></button>`).join('')}</div></div>
   ${['veg','fruit','dairy'].map(s=>{const c=CATEGORIES.find(x=>x.slug==s);return `<div class="sec"><div class="sec-h"><h2>${c.name}</h2><a class="link" href="#/shop/${s}">Shop all ${ic('chev',12)}</a></div><div class="hs">${by(s).map(card).join('')}</div></div>`}).join('')}
   <div class="sec"><div class="sec-h"><h2>Best deals</h2></div><div class="grid2">${[...PRODUCTS].sort((a,b)=>(b.mrp-b.price)/b.mrp-(a.mrp-a.price)/a.mrp).slice(0,6).map(card).join('')}</div></div>
   <div class="trust"><div>${ic('bolt',18)}Fast delivery</div><div>${ic('shield',18)}Quality checked</div><div>${ic('tag',18)}Best prices</div></div>`},

categories(){
  return `${pageTop('Categories')}<div class="sec" style="padding-top:14px"><div class="cats">${CATEGORIES.map(c=>`<button class="cat" data-go="#/shop/${c.slug}"><img src="${c.img}" alt="" decoding="async" width="100" height="100"><b>${c.name}</b></button>`).join('')}</div></div>`},

shop(slug){
  const c=CATEGORIES.find(x=>x.slug==slug)||{name:'All products',slug:'all'};
  const list=slug=='all'?PRODUCTS:PRODUCTS.filter(p=>p.cat==slug);
  return `${pageTop(c.name,`<button class="ib" data-act="search" aria-label="Search">${ic('search',18)}</button>`)}
   <div class="tabs"><a class="tab ${slug=='all'?'on':''}" href="#/shop/all">All</a>${CATEGORIES.map(x=>`<a class="tab ${x.slug==slug?'on':''}" href="#/shop/${x.slug}">${x.name}</a>`).join('')}</div>
   <div class="sec" style="padding-top:12px"><div class="grid2">${list.map(card).join('')}</div></div>`},

product(id){
  const p=P(id);if(!p)return views.home();const off=p.mrp-p.price;
  const more=PRODUCTS.filter(x=>x.cat==p.cat&&x.id!=p.id);
  return `<div class="pd-img"><img src="${p.img}" alt="${p.name}">
     <div style="position:absolute;top:calc(10px + env(safe-area-inset-top));left:12px;right:12px;display:flex;justify-content:space-between">
     <button class="ib" style="background:#fff;box-shadow:var(--sh)" data-back aria-label="Back">${ic('back',20)}</button>
     <button class="ib fav ${favs.includes(p.id)?'on':''}" style="position:static;background:#fff;box-shadow:var(--sh);width:36px;height:36px" data-act="fav" data-id="${p.id}" aria-label="Wishlist">${ic('heart',18)}</button></div></div>
   <div class="card pd-card"><div class="eta-pill">${ic('bolt',12)} 8 mins</div><h1>${p.name}</h1><div class="pq" style="font-size:12px;margin-top:4px">Net quantity: ${p.qty}</div>
     <div class="price" style="margin-top:12px"><span class="pill big">${inr(p.price)}</span>${off>0?`<span class="mrp" style="font-size:13px">MRP ${inr(p.mrp)}</span><span class="off" style="margin:0">${inr(off)} OFF</span>`:''}</div>
     <div class="pq" style="margin-top:6px">(incl. of all taxes)</div></div>
   <div class="trust" style="margin-top:0"><div>${ic('bolt',18)}Fast delivery</div><div>${ic('shield',18)}Quality checked</div><div>${ic('check',18)}Easy refunds</div></div>
   <div class="sec"><div class="sec-h"><h2>You might also like</h2></div><div class="hs">${more.map(card).join('')}</div></div>
   <div class="pay" data-pay="${p.id}">${payBar(p)}</div>`},

cart(){
  const ids=Object.keys(cart);
  if(!ids.length)return `${pageTop('Cart')}<div class="empty">${ic('cart',48)}<b style="font-size:16px;color:var(--ink)">Your cart is empty</b><p style="margin:6px 0 18px">Add fresh groceries and get them in minutes.</p><a class="btn" href="#/shop/all">Shop all</a></div>`;
  const t=total(),saved=mrpTotal()-t,fee=t>=FREE_AT?0:25,cu=useCash?Math.min(cash,t+fee):0,pay=t+fee-cu,ad=curAddr();
  return `${pageTop('Cart',`<button class="ib" data-act="addr" aria-label="Address">${ic('pin',18)}</button>`)}
   <div class="save">${ic('tag',18)} Yay! You saved ${inr(saved)} on this order</div>
   <div class="card" style="margin:12px 14px 0"><div class="row" style="padding:12px;border-bottom:1px solid var(--line)">${ic('clock',20,'')}<div><b>Delivering in 8 mins</b><div class="pq">${count()} item${count()>1?'s':''}</div></div></div>
     ${ids.map(id=>{const p=P(id);return `<div class="cart-item"><img src="${p.img}" alt="" decoding="async" width="54" height="54"><div class="m"><div class="pn">${p.name}</div><div class="pq">${p.qty}</div><div class="price" style="margin-top:4px"><b>${inr(p.price*cart[id])}</b><span class="mrp">${inr(p.mrp*cart[id])}</span></div></div>
       <div class="stepper" data-id="${id}"><button data-act="dec">${ic('minus',14)}</button><span>${cart[id]}</span><button data-act="inc">${ic('plus',14)}</button></div></div>`}).join('')}</div>
   <div class="card" style="margin:12px 14px 0;padding:12px"><div class="row" style="align-items:flex-start">${ic('pin',20,'gico')}<div style="flex:1;min-width:0">${ad?`<b>Delivering to ${esc(ad.label)} · ${esc(ad.area)}</b><div class="pq" style="font-size:12px">${esc(addrLine(ad))}</div>`:`<b>No delivery address</b><div class="pq" style="font-size:12px">Add where we should deliver</div>`}</div><button class="link" data-act="addr">${ad?'Change':'Add'}</button></div></div>
   ${cash>0?`<button class="card li" style="margin:12px 14px 0;width:calc(100% - 28px)" data-act="usecash">${ic('wallet',20)}<span>Use Freshly cash<small>Balance ${inr(cash)}</small></span><span class="sw ${useCash?'on':''}"></span></button>`:''}
   <div class="card bill" style="margin:12px 14px 0"><b style="display:block;margin-bottom:6px">Bill summary</b>
     <div class="r"><span>Item total</span><span><s class="mrp">${inr(mrpTotal())}</s> ${inr(t)}</span></div>
     <div class="r"><span>Delivery fee</span>${fee?`<span>${inr(fee)}</span>`:'<span class="free">FREE</span>'}</div>
     <div class="r"><span>Handling fee</span><span class="free">FREE</span></div>
     ${cu?`<div class="r"><span>Freshly cash</span><span class="free">-${inr(cu)}</span></div>`:''}<div class="r t"><span>To pay</span><span>${inr(pay)}</span></div></div>
   <div class="sec"><div class="sec-h"><h2>Add more</h2></div><div class="hs">${PRODUCTS.filter(p=>!cart[p.id]).slice(0,8).map(card).join('')}</div></div>
   <div class="pay"><div><small>To pay</small><b style="font-size:17px">${inr(pay)}</b></div><button class="btn ${payPref=='online'?'':'out'}" data-act="order" data-m="online">Pay online</button><button class="btn ${payPref=='cod'?'':'out'}" data-act="order" data-m="cod">Pay on delivery</button></div>`},

profile(){
  const L=(i,t,s,h)=>`<button class="li" data-go="${h}">${ic(i,20)}<span>${t}${s?`<small>${s}</small>`:''}</span>${ic('chev',16)}</button>`;
  return `${pageTop('Profile')}
   <div class="prof-h"><div class="av">${ic('user',28)}</div><div style="flex:1"><b>${esc(user.name)}</b><span>${esc(user.phone)}${user.email?' · '+esc(user.email):''}</span></div><button class="ib" data-go="#/editprofile" aria-label="Edit">${ic('edit',18)}</button></div>
   <div class="quick"><button data-go="#/orders">${ic('bag',22)}Your orders</button><button data-go="#/help">${ic('help',22)}Help &amp; support</button><button data-go="#/wishlist">${ic('heart',22)}Wishlist${favs.length?` (${favs.length})`:''}</button></div>
   <div class="list"><h3 style="margin:14px 0 8px">Money center</h3><div class="card">${L('wallet','Freshly cash &amp; gift card',inr(cash),'#/wallet')}</div></div>
   <div class="list"><h3 style="margin:10px 0 8px">Your information</h3><div class="card">
     ${L('star','Review &amp; earn','','#/review')}${L('wallet','Your refunds','','#/refunds')}${L('heart','Your wishlist',favs.length+' item'+(favs.length==1?'':'s'),'#/wishlist')}${L('gift','E-gift cards','','#/giftcards')}${L('help','Help &amp; support','','#/help')}
     ${L('pin','Saved addresses',addrs.length+' address'+(addrs.length==1?'':'es'),'#/addresses')}${L('edit','Edit profile','','#/editprofile')}${L('gift','Rewards',pts+' points','#/rewards')}${L('card','Payment management','','#/payments')}</div></div>
   <div class="list"><h3 style="margin:10px 0 8px">Other information</h3><div class="card">${L('tag','Suggest products','','#/suggest')}${L('bell','Notifications','','#/notifications')}${L('info','General info','','#/info')}</div></div>
   <button class="btn out logout card" data-act="logout">Log out</button><div class="ver">App version 1.1.0</div>`},

/* ---- location / addresses ---- */
location(a){return locView(a)},
addresses(){
  return `${pageTop('Saved addresses')}<div class="sec" style="padding-top:14px">
   <button class="btn" style="width:100%;margin-bottom:12px;background:#fff;color:var(--g600);border:1.5px dashed var(--g500);box-shadow:none" data-go="#/location/new">${ic('plus',16)} Add new address</button>
   ${addrs.length?addrs.map(a=>addrCard(a)).join(''):`<div class="empty" style="padding:50px 20px">${ic('pin',44)}<b style="color:var(--ink)">No saved addresses</b><p style="margin-top:6px">Add one so we can deliver to the exact spot.</p></div>`}</div>`},

/* ---- orders ---- */
orders(){
  return `${pageTop('Your orders')}<div class="sec" style="padding-top:14px">${orders.length?[...orders].reverse().map(o=>{const s=ostatus(o);
   return `<div class="card ord" data-go="#/order/${o.id}"><div class="row" style="justify-content:space-between"><b>Order #${String(o.id).slice(-6)}</b><span class="st st${s.s}">${s.k}</span></div>
    <div class="pq">${dt(o.ts)} · ${o.items.reduce((a,x)=>a+x.qty,0)} items · ${inr(o.pay)}</div>
    <div class="thumbs">${o.items.slice(0,5).map(x=>`<img src="${x.img}" alt="">`).join('')}${o.items.length>5?`<span>+${o.items.length-5}</span>`:''}</div>
    <div class="pq row" style="margin-top:8px">${ic('pin',13)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.addr.area)}</span></div>
    <button class="btn out sm" data-act="reorder" data-id="${o.id}">Reorder</button></div>`}).join(''):`<div class="empty">${ic('bag',48)}<b style="font-size:16px;color:var(--ink)">No orders yet</b><p style="margin:6px 0 18px">Your orders will show up here.</p><a class="btn" href="#/shop/all">Start shopping</a></div>`}</div>`},
order(id){
  const o=orders.find(x=>x.id==id);if(!o)return views.orders();const s=ostatus(o);
  const steps=['Order placed','Packed','Out for delivery','Delivered'];
  return `${pageTop('Order #'+String(o.id).slice(-6))}
   ${o.cancelled?'':`<div id="tmap" class="tmap"></div>`}
   <div class="card" style="margin:12px 14px 0;padding:14px"><div class="row" style="justify-content:space-between"><b id="otitle">${o.cancelled?'Order cancelled':s.s==3?'Delivered':'Arriving soon'}</b><span id="oeta" class="eta-pill" style="margin:0">${s.s==3||o.cancelled?'':ic('bolt',12)+' <span id="omin"></span>'}</span></div>
     ${o.cancelled?`<p class="pq" style="margin-top:8px">${o.method=='online'?'Refund of '+inr(o.pay)+' initiated to your source account.':'No payment was taken.'}</p>`:`<div class="steps" id="osteps">${steps.map((t,i)=>`<div class="stp ${i<=s.s?'on':''}"><i></i><span>${t}</span></div>`).join('')}</div>`}</div>
   <div class="card" style="margin:12px 14px 0;padding:14px"><b>Delivery address</b><div class="pq" style="font-size:12px;margin-top:4px"><b style="color:var(--ink)">${esc(o.addr.label)} · ${esc(o.addr.area)}</b><br>${esc(addrLine(o.addr))}</div></div>
   <div class="card" style="margin:12px 14px 0">${o.items.map(x=>`<div class="cart-item"><img src="${x.img}" alt=""><div class="m"><div class="pn">${esc(x.name)}</div><div class="pq">${x.qty} × ${inr(x.price)}</div></div><b>${inr(x.price*x.qty)}</b></div>`).join('')}</div>
   <div class="card bill" style="margin:12px 14px 0"><b style="display:block;margin-bottom:6px">Bill summary</b><div class="r"><span>Item total</span><span>${inr(o.sub)}</span></div><div class="r"><span>Delivery fee</span><span>${o.fee?inr(o.fee):'<span class="free">FREE</span>'}</span></div>${o.cashUsed?`<div class="r"><span>Freshly cash</span><span>-${inr(o.cashUsed)}</span></div>`:''}<div class="r t"><span>Paid (${o.method=='online'?'online':'on delivery'})</span><span>${inr(o.pay)}</span></div></div>
   ${!o.cancelled&&s.s<2?`<button class="btn out logout card" data-act="cancel" data-id="${o.id}">Cancel order</button>`:''}`},
wishlist(){
  const l=PRODUCTS.filter(p=>favs.includes(p.id));
  return `${pageTop('Your wishlist')}<div class="sec" style="padding-top:14px">${l.length?`<div class="grid2">${l.map(card).join('')}</div>`:`<div class="empty">${ic('heart',48)}<b style="font-size:16px;color:var(--ink)">Nothing saved yet</b><p style="margin:6px 0 18px">Tap the heart on any product to save it.</p><a class="btn" href="#/shop/all">Browse products</a></div>`}</div>`},
editprofile(){
  return `${pageTop('Edit profile')}<div class="sec" style="padding-top:14px"><div class="card" style="padding:14px">
   <label class="lab">Name</label><input id="pn" class="fld" value="${esc(user.name)}">
   <label class="lab">Mobile number</label><input id="pp" class="fld" inputmode="tel" value="${esc(user.phone)}">
   <label class="lab">Email</label><input id="pe" class="fld" type="email" placeholder="you@example.com" value="${esc(user.email)}">
   <button class="btn" style="width:100%" data-act="saveprofile">Save changes</button></div></div>`},
wallet(){
  return `${pageTop('Freshly cash &amp; gift card')}<div class="sec" style="padding-top:14px"><div class="card" style="padding:18px;text-align:center"><small class="pq">Available balance</small><div style="font-size:30px;font-weight:700;color:var(--g600)">${inr(cash)}</div><div class="pq">Used automatically at checkout if you choose</div></div>
   <div class="card" style="padding:14px;margin-top:12px"><b>Redeem gift / promo code</b><input id="gc" class="fld" style="margin-top:10px" placeholder="Enter code (try FRESH50)" autocapitalize="characters"><button class="btn" style="width:100%" data-act="redeem">Redeem</button></div></div>`},
giftcards(){
  return `${pageTop('E-gift cards')}<div class="sec" style="padding-top:14px"><div class="card" style="padding:14px"><b>Send a gift card</b>
   <div class="chips" style="padding:12px 0 4px" id="gamts">${[100,250,500,1000].map((v,i)=>`<button class="chip ${i==1?'on':''}" data-amt="${v}">${inr(v)}</button>`).join('')}</div>
   <input id="gto" class="fld" type="email" placeholder="Recipient email"><input id="gms" class="fld" placeholder="Message (optional)"><button class="btn" style="width:100%" data-act="buygift">Buy gift card</button></div>
   ${gifts.length?`<h3 style="margin:16px 2px 8px">Purchased</h3>${gifts.map(g=>`<div class="card gcard"><div><b>${inr(g.amt)}</b><div class="pq">To ${esc(g.to)} · ${dt(g.ts)}</div></div><code>${g.code}</code></div>`).join('')}`:''}</div>`},
rewards(){
  const lvl=pts>=500?'Gold':pts>=200?'Silver':'Bronze',next=pts>=500?500:pts>=200?500:200;
  return `${pageTop('Rewards')}<div class="sec" style="padding-top:14px"><div class="card" style="padding:18px"><div class="row" style="justify-content:space-between"><div><small class="pq">Your points</small><div style="font-size:30px;font-weight:700;color:var(--g600)">${pts}</div></div><span class="pill">${lvl}</span></div>
   <div class="bar"><i style="width:${Math.min(100,pts/next*100)}%"></i></div><div class="pq">${pts>=500?'Top tier unlocked!':(next-pts)+' points to next level'}</div></div>
   <div class="card" style="padding:14px;margin-top:12px"><b>How to earn</b><p class="pq" style="font-size:12px;margin-top:6px;line-height:1.6">• 1 point for every ₹10 you spend<br>• 10 points for every product you review<br>• Redeem 100 points = ₹10 Freshly cash</p>
   <button class="btn" style="width:100%;margin-top:12px" data-act="redeempts" ${pts<100?'disabled style="width:100%;margin-top:12px;opacity:.5"':''}>Redeem 100 points</button></div></div>`},
payments(){
  return `${pageTop('Payment management')}<div class="sec" style="padding-top:14px"><div class="card">
   ${[['cod','Pay on delivery','Cash / UPI to rider'],['online','Pay online','UPI, cards, netbanking']].map(([k,t,s])=>`<button class="li" data-act="paypref" data-k="${k}">${ic(k=='cod'?'wallet':'card',20)}<span>${t}<small>${s}</small></span><span class="radio ${payPref==k?'on':''}"></span></button>`).join('')}</div>
   <p class="pq" style="margin:10px 4px">Your preferred method is highlighted at checkout. No card details are stored in this demo.</p></div>`},
refunds(){
  const l=orders.filter(o=>o.cancelled);
  return `${pageTop('Your refunds')}<div class="sec" style="padding-top:14px">${l.length?l.map(o=>`<div class="card ord" data-go="#/order/${o.id}"><div class="row" style="justify-content:space-between"><b>Order #${String(o.id).slice(-6)}</b><span class="st st-1">${o.method=='online'?'Refund initiated':'No refund due'}</span></div><div class="pq">${dt(o.ts)} · ${inr(o.pay)}</div></div>`).join(''):`<div class="empty">${ic('wallet',48)}<b style="font-size:16px;color:var(--ink)">No refunds</b><p style="margin-top:6px">Cancelled orders and refunds appear here.</p></div>`}</div>`},
review(){
  const seen={};orders.forEach(o=>o.items.forEach(x=>seen[x.id]=x));const l=Object.values(seen);
  return `${pageTop('Review &amp; earn')}<div class="sec" style="padding-top:14px">${l.length?`<p class="pq" style="margin:0 2px 10px">Rate products you bought and earn 10 points each.</p>${l.map(x=>`<div class="card" style="padding:12px;margin-bottom:10px"><div class="row"><img src="${x.img}" style="width:46px;height:46px;border-radius:3px" alt=""><div style="flex:1"><div class="pn" style="margin:0">${esc(x.name)}</div></div></div><div class="stars" data-id="${x.id}">${[1,2,3,4,5].map(n=>`<button data-act="rate" data-n="${n}" class="${(ratings[x.id]||0)>=n?'on':''}">${ic('star',24)}</button>`).join('')}</div></div>`).join('')}`:`<div class="empty">${ic('star',48)}<b style="font-size:16px;color:var(--ink)">Nothing to review yet</b><p style="margin-top:6px">Order something first.</p></div>`}</div>`},
suggest(){
  return `${pageTop('Suggest products')}<div class="sec" style="padding-top:14px"><div class="card" style="padding:14px"><b>What should we stock?</b><input id="sg" class="fld" style="margin-top:10px" placeholder="Product name &amp; brand"><button class="btn" style="width:100%" data-act="suggest">Submit suggestion</button></div>
   ${suggests.length?`<h3 style="margin:16px 2px 8px">Your suggestions</h3><div class="card">${suggests.map(x=>`<div class="li" style="cursor:default">${ic('tag',18)}<span>${esc(x)}</span></div>`).join('')}</div>`:''}</div>`},
notifications(){
  const T=(k,t,s)=>`<button class="li" data-act="pref" data-k="${k}"><span>${t}<small>${s}</small></span><span class="sw ${prefs[k]?'on':''}"></span></button>`;
  const n=orders.slice(-5).reverse().map(o=>`<div class="li" style="cursor:default">${ic('bag',18)}<span>Order #${String(o.id).slice(-6)} — ${ostatus(o).k}<small>${dt(o.ts)}</small></span></div>`).join('');
  return `${pageTop('Notifications')}<div class="sec" style="padding-top:14px"><div class="card">${T('orders','Order updates','Packed, out for delivery, delivered')}${T('offers','Offers &amp; deals','Discounts on your favourites')}${T('news','News &amp; tips','Occasional updates from Freshly')}</div>
   <h3 style="margin:16px 2px 8px">Recent</h3><div class="card">${n||'<div class="none" style="padding:24px">No notifications yet</div>'}</div></div>`},
help(){
  const F=[['Where is my order?','Open Profile → Your orders and tap the order to see live tracking on the map.'],['How do I change my delivery address?','Tap the address at the top of Home or Cart, pick a saved one or add a new one by moving the map pin.'],['How do I cancel an order?','Open the order and tap Cancel order. You can cancel until it is out for delivery.'],['When do I get a refund?','Online payments are refunded to the source account in 3–5 working days.'],['Is delivery free?','Yes, on orders of '+inr(FREE_AT)+' or more. Otherwise a ₹25 fee applies.']];
  return `${pageTop('Help &amp; support')}<div class="sec" style="padding-top:14px"><div class="quick" style="padding:0 0 12px;grid-template-columns:1fr 1fr"><a class="btn out" style="text-decoration:none" href="tel:+911800000000">${ic('phone',18)} Call us</a><a class="btn out" style="text-decoration:none" href="mailto:support@freshly.app">${ic('mail',18)} Email</a></div>
   <div class="card faq">${F.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div>`},
info(){
  const F=[['About Freshly','Freshly delivers groceries in minutes from a store near you.'],['Terms of use','By using Freshly you agree to our terms of service. (Demo app text.)'],['Privacy policy','Your location is used only to show delivery availability and deliver your order. Data is stored on this device in this demo.'],['Licences','Map data © OpenStreetMap contributors. Maps by Leaflet.']];
  return `${pageTop('General info')}<div class="sec" style="padding-top:14px"><div class="card faq">${F.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div><div class="ver">App version 1.1.0</div></div>`}
};
function payBar(p){const q=cart[p.id]||0;
  return q?`<a class="btn out" href="#/cart" style="flex:1">${ic('cart',18)} View cart</a><div class="stepper" data-id="${p.id}" style="height:46px"><button data-act="dec" style="height:46px;width:44px">${ic('minus',16)}</button><span>${q}</span><button data-act="inc" style="height:46px;width:44px">${ic('plus',16)}</button></div>`
          :`<button class="btn" style="flex:1" data-act="inc" data-id="${p.id}">Add to cart</button>`}


/* popup quick-view card */
function openQuick(id){const p=P(id);if(!p)return;const off=p.mrp-p.price;
  openSheet(`<div class="qv"><button class="ib qv-x" data-act="closeov" aria-label="Close">${ic('close',18)}</button>
   <div class="qv-img"><img src="${p.img}" alt="${p.name}">${off>0?`<span class="pc-badge">${Math.round(off/p.mrp*100)}% OFF</span>`:''}
    <button class="fav ${favs.includes(p.id)?'on':''}" data-act="fav" data-id="${p.id}" aria-label="Wishlist">${ic('heart',16)}</button></div>
   <div class="eta-pill" style="margin-top:12px">${ic('bolt',12)} 8 mins</div><h2>${p.name}</h2><div class="pq">Net quantity: ${p.qty}</div>
   <div class="price"><span class="pill big">${inr(p.price)}</span>${off>0?`<span class="mrp" style="font-size:13px">MRP ${inr(p.mrp)}</span><span class="off" style="margin:0">${inr(off)} OFF</span>`:''}</div>
   <div class="qv-perks"><span>${ic('bolt',13)}Fast delivery</span><span>${ic('shield',13)}Quality checked</span><span>${ic('check',13)}Easy refunds</span></div>
   <div class="qv-act" data-qslot="${p.id}">${payBar(p)}</div>
   <button class="qv-more" data-go="#/product/${p.id}">View full details ${ic('chev',14)}</button></div>`)}
function along(pts,p){if(pts.length<2)return pts[0];const d=[0];for(let i=1;i<pts.length;i++)d[i]=d[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  const t=d[d.length-1]*p;let i=1;while(i<d.length-1&&d[i]<t)i++;const f=(t-d[i-1])/((d[i]-d[i-1])||1);
  return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f]}

/* nav + cart bar */
function chrome(route){
  const n=count(),items=[['home','Home','#/'],['grid','Categories','#/categories'],['cart','Cart','#/cart'],['user','Profile','#/profile']];
  const on=route=='home'?'#/':route=='categories'||route=='shop'?'#/categories':route=='cart'?'#/cart':PROF.includes(route)?'#/profile':'';
  const nav=$('#nav');nav.classList.toggle('hide',HIDE.includes(route));
  nav.innerHTML=items.map(([i,l,h])=>`<a href="${h}" class="${on==h?'on':''}">${ic(i,22)}${l}${l=='Cart'&&n?`<span class="badge">${n}</span>`:''}</a>`).join('');
  const bar=$('#cartbar');
  if(n&&!HIDE.includes(route)&&!['cart','product','order'].includes(route)){const t=total(),need=FREE_AT-t;
    bar.innerHTML=`<a class="cb" href="#/cart" style="text-decoration:none;color:#fff"><div>${n} item${n>1?'s':''} | ${inr(t)}<small>${need>0?`Add ${inr(need)} more for free delivery`:'Free delivery unlocked'}</small></div><span class="go">View cart ${ic('chev',16)}</span></a>`}
  else bar.innerHTML='';
}

/* Leaflet is only fetched when a map page is opened (saves RAM + startup time) */
let _lp=null;
function loadLeaflet(){if(window.L)return Promise.resolve();if(_lp)return _lp;
  _lp=new Promise(res=>{const c=document.createElement('link');c.rel='stylesheet';c.href='lib/leaflet.css';document.head.appendChild(c);
    const s=document.createElement('script');s.src='lib/leaflet.js';s.onload=res;s.onerror=()=>{_lp=null;res()};document.head.appendChild(s)});return _lp}
let _tok=0;

/* router */
let route='home';
const HIDE=['location'], PROF=['profile','addresses','orders','wishlist','editprofile','wallet','giftcards','rewards','payments','refunds','review','suggest','notifications','help','info'];
const after={location:locInit,order:orderInit};
function render(){
  const [,r,a]=(location.hash||'#/').split('/');
  route=r||'home';
  if(!views[route])route='home';
  locCleanup();timers.splice(0).forEach(clearInterval);closeOv();
  const vw=$('#view');vw.classList.toggle('still',!!render.still);render.still=0;
  vw.innerHTML=views[route](a);
  chrome(route);
  $('#view').style.paddingBottom=route=='location'?'0':(route=='product'||route=='cart')?'175px':'';
  scrollTo(0,0);
  const fn=after[route],tok=++_tok;
  if(fn){if(route=='location'||route=='order')loadLeaflet().then(()=>{if(tok==_tok)fn(a)});else fn(a)}
}
addEventListener('hashchange',()=>requestAnimationFrame(render));

/* refresh counts in place (no scroll jump) */
function refresh(){
  save();
  document.querySelectorAll('[data-slot]').forEach(s=>{s.innerHTML=addBtn(P(s.dataset.slot))});
  document.querySelectorAll('[data-qslot]').forEach(s=>{s.innerHTML=payBar(P(s.dataset.qslot))});
  if(route=='cart'){const y=scrollY;render.still=1;render();scrollTo(0,y);return}
  const pay=$('.pay[data-pay]');if(pay)pay.innerHTML=payBar(P(pay.dataset.pay));
  chrome(route);
}

/* overlay */
function openSheet(html){const o=$('#overlay');o.innerHTML=html;o.classList.add('open')}
function closeOv(){$('#overlay').classList.remove('open');$('#overlay').innerHTML=''}
function openSearch(){
  openSheet(`<div class="panel"><div class="top"><div class="s-in">${ic('search',18)}<input id="q" placeholder='Search "milk"' autocomplete="off"></div><button class="ib" data-act="closeov" aria-label="Close">${ic('close',18)}</button></div><div id="res"></div></div>`);
  const res=$('#res'),q=$('#q');
  const sug=()=>res.innerHTML=`<div class="chips">${['Milk','Tomato','Atta','Banana','Eggs','Paneer'].map(x=>`<button class="chip" data-q="${x}">${x}</button>`).join('')}</div>`;
  sug();q.focus();
  let _st;q.oninput=()=>{clearTimeout(_st);_st=setTimeout(doS,90)};const doS=()=>{const v=q.value.trim().toLowerCase();if(!v)return sug();
    const r=PRODUCTS.filter(p=>p.name.toLowerCase().includes(v)||p.cat.includes(v)||CATEGORIES.find(c=>c.slug==p.cat).name.toLowerCase().includes(v));
    res.innerHTML=r.length?`<div class="sec" style="padding-top:12px"><div class="grid2">${r.map(card).join('')}</div></div>`:`<div class="none">No results for "${esc(q.value)}"</div>`}
}
function addrCard(a,sheet){
  const on=a.id==curAddr()?.id;
  return `<div class="addr-opt ${on?'':'off'}" data-act="selAddr" data-id="${a.id}">${ic(a.label=='Work'?'briefcase':a.label=='Home'?'home':'pin',20)}<div style="flex:1;min-width:0"><b>${esc(a.label)}</b> ${on?'<span class="pill" style="font-size:10px">Selected</span>':''}<div style="font-weight:600;font-size:12.5px;margin-top:3px">${esc(a.area)}</div><div class="pq" style="font-size:12px;margin-top:2px">${esc(addrLine(a))}</div>
   <div class="aa"><button data-act="editAddr" data-id="${a.id}">${ic('edit',14)} Edit</button><button data-act="delAddr" data-id="${a.id}">${ic('trash',14)} Delete</button></div></div></div>`}
function openAddr(){openSheet(`<div class="sheet"><div class="sheet-h">Select address<button class="ib" data-act="closeov">${ic('close',18)}</button></div>
  <button class="btn" style="width:100%;margin-bottom:12px;background:#fff;color:var(--g600);border:1.5px dashed var(--g500);box-shadow:none" data-go="#/location/new">${ic('plus',16)} Add new address on map</button>
  <div style="max-height:50vh;overflow:auto">${addrs.map(a=>addrCard(a)).join('')||'<div class="none" style="padding:20px">No saved addresses yet</div>'}</div></div>`)}

/* order tracking */
function orderInit(id){
  const o=orders.find(x=>x.id==id);if(!o||o.cancelled)return;
  const dest=[o.addr.lat,o.addr.lng],src=[dest[0]+STORE_OFF.lat,dest[1]+STORE_OFF.lng];
  let map=null,rider=null,path=[src,dest],line=null;
  if(window.L&&$('#tmap')){
    map=L.map('tmap',{zoomControl:false,attributionControl:false}).setView(dest,15);
    tiles().addTo(map);
    L.marker(dest,{icon:L.divIcon({className:'mk',html:'📍',iconSize:[30,30],iconAnchor:[15,28]})}).addTo(map);
    L.marker(src,{icon:L.divIcon({className:'mk',html:'🏪',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
    rider=L.marker(src,{icon:L.divIcon({className:'mk',html:'🛵',className:'mk rider',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map);
    map.fitBounds([src,dest],{padding:[40,40]});
    line=L.polyline(path,{color:'#1faa4b',weight:5,opacity:.85,className:'route-line'}).addTo(map);
    fetch(`https://router.project-osrm.org/route/v1/driving/${src[1]},${src[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`).then(r=>r.json()).then(j=>{const c=j.routes&&j.routes[0]&&j.routes[0].geometry.coordinates;if(!c||!line)return;path=c.map(x=>[x[1],x[0]]);line.setLatLngs(path);map.fitBounds(path,{padding:[40,40]})}).catch(()=>{});
    LOCMAP=map;
  }
  const tick=()=>{
    const o2=orders.find(x=>x.id==id);if(!o2)return;
    const st=ostatus(o2),p=Math.min(1,Math.max(0,(Date.now()-o2.ts-60e3)/(TOTAL_MS-60e3)));
    if(rider)rider.setLatLng(along(path,p));
    const left=Math.max(0,Math.ceil((TOTAL_MS-(Date.now()-o2.ts))/60000));
    const m=$('#omin');if(m)m.textContent=left+' min';
    const t=$('#otitle');if(t)t.textContent=st.s==3?'Delivered':st.s==2?'Rider is on the way':st.s==1?'Packed & ready':'Preparing your order';
    document.querySelectorAll('#osteps .stp').forEach((e,i)=>e.classList.toggle('on',i<=st.s));
    if(st.s==3){const e=$('#oeta');if(e)e.innerHTML='';if(!o2.done){o2.done=1;pts+=0;kvs('orders',orders)}}
  };
  tick();timers.push(setInterval(()=>{if(!document.hidden)tick()},window.LITE?2000:1000));
}

function placeOrder(method){
  const ad=curAddr();
  if(!ad){toast('Add a delivery address first');openAddr();return}
  const t=total(),fee=t>=FREE_AT?0:25,cu=useCash?Math.min(cash,t+fee):0,pay=t+fee-cu;
  const o={id:Date.now(),ts:Date.now(),method,sub:t,fee,cashUsed:cu,pay,addr:{...ad},items:Object.entries(cart).map(([id,q])=>{const p=P(id);return {id:p.id,name:p.name,img:p.img,price:p.price,qty:q}})};
  orders.push(o);cash-=cu;pts+=Math.floor(pay/10);useCash=false;kvs('orders',orders);kvs('cash',cash);kvs('pts',pts);
  cart={};save();toast('Order placed!');location.hash='#/order/'+o.id;
}
/* events */
document.addEventListener('click',e=>{
  const ov=$('#overlay');
  if(e.target===ov){closeOv();return}
  const a=e.target.closest('[data-act]');
  if(a){e.stopPropagation();const act=a.dataset.act,box=a.closest('[data-id]'),id=(box||a).dataset.id;
    if(act=='inc'){cart[id]=(cart[id]||0)+1;refresh()}
    else if(act=='dec'){cart[id]=(cart[id]||1)-1;if(cart[id]<=0)delete cart[id];refresh()}
    else if(act=='fav'){favs=favs.includes(+id)?favs.filter(x=>x!=id):[...favs,+id];save();document.querySelectorAll(`.fav[data-id="${id}"]`).forEach(b=>b.classList.toggle('on'));toast(favs.includes(+id)?'Added to wishlist':'Removed from wishlist')}
    else if(act=='search')openSearch();
    else if(act=='addr')openAddr();
    else if(act=='closeov')closeOv();
    else if(act=='selAddr'){selId=+id;saveAddrs();closeOv();if(route=='addresses')render();else{chrome(route);render()}toast('Delivery address updated')}
    else if(act=='editAddr'){closeOv();location.hash='#/location/'+id}
    else if(act=='delAddr'){addrs=addrs.filter(x=>x.id!=id);if(selId==id)selId=addrs[0]?.id||null;saveAddrs();closeOv();render();toast('Address deleted')}
    else if(act=='usecash'){useCash=!useCash;render()}
    else if(act=='order')placeOrder(a.dataset.m);
    else if(act=='reorder'){const o=orders.find(x=>x.id==id);o.items.forEach(x=>cart[x.id]=(cart[x.id]||0)+x.qty);save();location.hash='#/cart'}
    else if(act=='cancel'){if(confirm('Cancel this order?')){const o=orders.find(x=>x.id==id);o.cancelled=true;kvs('orders',orders);render();toast('Order cancelled')}}
    else if(act=='logout'){if(confirm('Log out?')){cart={};favs=[];['cart','favs','orders','user','addrs','selAddr'].forEach(k=>localStorage.removeItem(k));location.hash='#/';location.reload()}}
    else if(act=='saveprofile'){const n=$('#pn').value.trim(),p=$('#pp').value.trim();if(!n||p.replace(/\D/g,'').length<10){toast('Enter name and valid mobile');return}user={name:n,phone:p,email:$('#pe').value.trim()};kvs('user',user);toast('Profile updated');history.back()}
    else if(act=='redeem'){const c=$('#gc').value.trim().toUpperCase();const g=gifts.find(x=>x.code==c&&!x.used);
      if(redeemed.includes(c))toast('Code already used');else if(c=='FRESH50'||g){cash+=g?g.amt:50;if(g)g.used=1;redeemed.push(c);kvs('cash',cash);kvs('redeemed',redeemed);kvs('gifts',gifts);toast('Added to Freshly cash');render()}else toast('Invalid code')}
    else if(act=='buygift'){const to=$('#gto').value.trim(),amt=+(document.querySelector('#gamts .on')?.dataset.amt||250);if(!/^\S+@\S+\.\S+$/.test(to)){toast('Enter a valid email');return}gifts.push({amt,to,ts:Date.now(),code:'FR'+Math.random().toString(36).slice(2,8).toUpperCase()});kvs('gifts',gifts);toast('Gift card created (demo)');render()}
    else if(act=='redeempts'){if(pts>=100){pts-=100;cash+=10;kvs('pts',pts);kvs('cash',cash);toast('₹10 added to Freshly cash');render()}}
    else if(act=='paypref'){payPref=a.dataset.k;kvs('payPref',payPref);render()}
    else if(act=='pref'){prefs[a.dataset.k]=!prefs[a.dataset.k];kvs('prefs',prefs);render()}
    else if(act=='rate'){const pid=a.closest('.stars').dataset.id;if(!ratings[pid]){pts+=10;kvs('pts',pts);toast('+10 points')}ratings[pid]=+a.dataset.n;kvs('ratings',ratings);const y=scrollY;render();scrollTo(0,y)}
    else if(act=='suggest'){const v=$('#sg').value.trim();if(!v)return;suggests.unshift(v);kvs('suggests',suggests);toast('Thanks for the suggestion!');render()}
    return}
  const am=e.target.closest('[data-amt]');if(am){document.querySelectorAll('#gamts .chip').forEach(x=>x.classList.toggle('on',x==am));return}
  const q=e.target.closest('[data-q]');if(q){const i=$('#q');i.value=q.dataset.q;i.oninput();return}
  if(e.target.closest('[data-back]')){history.length>1?history.back():location.hash='#/';return}
  const qk=e.target.closest('[data-quick]');if(qk){openQuick(qk.dataset.quick);return}
  const g=e.target.closest('[data-go]');if(g){closeOv();location.hash=g.dataset.go}
  if(e.target.closest('#res .pc'))closeOv();
});
render();

/* auto-hide top bar (profile + location): down = hide, up = show */
(()=>{let last=scrollY,tk=false,bar=null,away=false;
  const setAway=v=>{if(!bar||!bar.isConnected)bar=document.querySelector('.hero,.top');if(bar&&v!==away){bar.classList.toggle('away',v);away=v}};
  addEventListener('scroll',()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{
    const y=Math.max(0,scrollY),d=y-last;
    if(Math.abs(d)>6){setAway(d>0&&y>90);last=y}
    if(y<=10)setAway(false);
    tk=false})},{passive:true});
  addEventListener('hashchange',()=>{bar=null;away=false});
  addEventListener('hashchange',()=>{last=0});
})();

/* banner auto-scroll: every 3.5s, loops back to first, pauses 6s after touch/wheel */
(function(){let hold=0;const h=()=>{hold=Date.now()+6000};
  ['touchstart','pointerdown','wheel'].forEach(e=>addEventListener(e,h,{passive:true}));
  setInterval(()=>{const b=document.querySelector('.banners');
    if(!b||!b.firstElementChild||document.hidden||Date.now()<hold||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const max=b.scrollWidth-b.clientWidth,step=b.firstElementChild.offsetWidth+10;
    b.scrollTo({left:b.scrollLeft>=max-4?0:b.scrollLeft+step,behavior:'smooth'})},3500)})();

if('serviceWorker' in navigator&&(location.protocol=='https:'||location.hostname=='localhost'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
