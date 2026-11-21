import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHarness } from './moduleHarness.mjs';

async function fixture() {
  let cursor = 0, tree;
  const slots = [], effects = new Map(), queued = [], windowEvents = new Map(), documentEvents = new Map(), mediaEvents = new Map(), focused = [];
  class FakeNode {}
  const windowStub = { scrollY: 0, addEventListener: (k,v) => windowEvents.set(k,v), removeEventListener: k => windowEvents.delete(k),
    matchMedia: () => ({ addEventListener: (k,v) => mediaEvents.set(k,v), removeEventListener: k => mediaEvents.delete(k) }) };
  const hooks = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: (callback, deps) => { const i = cursor++, old = effects.get(i); if (!old || deps.some((d,n) => d !== old.deps[n])) queued.push(() => { old?.cleanup?.(); effects.set(i,{ deps, cleanup: callback() }); }); },
  };
  const load = createHarness({
    react: hooks,
    'next/dynamic': { default: () => () => React.createElement('div', { role: 'dialog' }, 'Stock search') },
    [path.resolve('app/components/PublicLogoImage.tsx')]: { default: props => React.createElement('img', { src: props.src, alt: props.alt }) },
    [path.resolve('app/components/home/HomeHeader.module.css')]: { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }, { window: windowStub, document: { addEventListener: (k,v) => documentEvents.set(k,v), removeEventListener: k => documentEvents.delete(k) }, Node: FakeNode });
  const { default: Header } = await load('app/components/home/HomeHeader.tsx');
  function visit(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const n of node) { const value = visit(n,predicate); if (value) return value; } return null; }
    if (predicate(node)) return node;
    return visit(node.props?.children,predicate);
  }
  function render() {
    cursor = 0;
    tree = Header({ phoneHref: 'tel:+8801000000000', searchItems: [], siteSettings: { websiteLogo: '/original-logo.svg', siteName: 'RECON IMPORTS', phoneNumber: 'Showroom phone' }, brands: [{name:'Toyota',slug:'toyota'}] });
    for (const label of ['Open navigation','Close navigation','Inventory','Brands']) {
      const n = visit(tree,n => n.type === 'button' && (n.props['aria-label'] === label || n.props['aria-controls'] === 'header-'+label.toLowerCase()));
      if (n?.props.ref) n.props.ref.current = { focus: () => focused.push(label) };
    }
    const h = visit(tree,n => n.type === 'header'); h.props.ref.current = { contains: () => false };
    while (queued.length) queued.shift()();
    return tree;
  }
  return { render, find: predicate => visit(tree,predicate), html: () => renderToStaticMarkup(tree), windowStub, windowEvents, documentEvents, mediaEvents, focused, FakeNode,
    dispose: () => { for (const e of effects.values()) e.cleanup?.(); } };
}

test('header starts transparent, restores scrolled state and returns to transparent at the page top', async () => {
  const f = await fixture(); f.render();
  assert.equal(f.find(n=>n.type==='header').props.className.trim(),'header');
  assert.ok(f.html().includes('/original-logo.svg'));
  f.windowStub.scrollY=100; f.windowEvents.get('scroll')(); f.render();
  assert.match(f.find(n=>n.type==='header').props.className,/scrolled/);
  f.windowStub.scrollY=0; f.windowEvents.get('pageshow')(); f.render();
  assert.equal(f.find(n=>n.type==='header').props.className.trim(),'header');
  f.dispose(); assert.equal(f.windowEvents.size,0); assert.equal(f.documentEvents.size,0);
});

test('mobile navigation and both dropdowns support click, Escape and breakpoint changes', async () => {
  const f=await fixture();f.render();
  f.find(n=>n.props?.['aria-label']==='Open navigation').props.onClick(); f.render();
  assert.equal(f.find(n=>n.props?.['aria-label']==='Close navigation').props['aria-expanded'],true);
  f.find(n=>n.props?.['aria-controls']==='header-inventory').props.onClick(); f.render();
  assert.equal(f.find(n=>n.props?.id==='header-inventory').props.hidden,false);
  f.find(n=>n.type==='header').props.onKeyDown({key:'Escape'}); f.render();
  assert.ok(f.focused.includes('Inventory'));
  assert.equal(f.find(n=>n.props?.id==='header-inventory').props.hidden,true);
  f.find(n=>n.props?.['aria-controls']==='header-brands').props.onClick();f.render();
  assert.equal(f.find(n=>n.props?.href==='/toyota').props.children,'Toyota');
  f.mediaEvents.get('change')();f.render();
  assert.equal(f.find(n=>n.props?.['aria-label']==='Open navigation').props['aria-expanded'],false);
  assert.equal(f.find(n=>n.props?.id==='header-brands').props.hidden,true);
});

test('all twelve labels remain present; missing features are explicitly unavailable rather than broken routes', async () => {
  const f=await fixture();f.render();const html=f.html();
  for(const label of ['Home','Inventory','Brands','Gallery','Stock List','Request Car','Verify Auction','Saved Cars','Compare','About Us','Payments','Contact'])assert.ok(html.includes(label),label);
  for(const label of ['Gallery','Saved Cars','Compare','Payments'])assert.ok(f.find(n=>n.props?.title===label+' is not available yet').props['aria-disabled']);
  for(const href of ['/brand-new','/reconditioned','/pre-owned','/pre-order','/stock-list.pdf','/send-requirements','/verify-auction-sheet','/about-us'])assert.ok(f.find(n=>n.props?.href===href),href);
  assert.equal(f.find(n=>n.props?.['aria-current']==='page').props.href,'/');
});

test('outside interaction closes mobile navigation and search closes menus before opening', async () => {
  const f=await fixture();f.render();
  f.find(n=>n.props?.['aria-label']==='Open navigation').props.onClick();f.render();
  f.documentEvents.get('pointerdown')({target:new f.FakeNode()});f.render();
  assert.equal(f.find(n=>n.props?.['aria-label']==='Open navigation').props['aria-expanded'],false);
  f.find(n=>n.props?.['aria-label']==='Search stock').props.onClick();f.render();
  assert.ok(f.html().includes('Stock search'));
});
