        const K = 'kanban.v1', $ = i => document.getElementById(i);
        const uid = () => Math.random().toString(36).slice(2, 9);
        const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const HUES = [210, 150, 30, 340, 270, 50, 190, 0];
        const pad = n => String(n).padStart(2, '0');
        const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) };
        const mk = name => ({ id: uid(), name, n: 0, tags: [], cols: [['Backlog', 'b'], ['Todo', 't'], ['In progress', 'p'], ['Done', 'd']].map(([n, k]) => ({ id: uid(), name: n, k, cards: [] })) });
        function seed() {
            const b = mk('Website relaunch'); b.tags = [{ id: uid(), name: 'Design', h: 270 }, { id: uid(), name: 'Copy', h: 30 }, { id: uid(), name: 'Dev', h: 210 }]; const T = i => b.tags[i].id;
            const a = (i, ti, o = {}) => { b.n++; b.cols[i].cards.push({ id: uid(), num: b.n, title: ti, desc: o.d || '', tags: (o.t || []).map(T), subs: (o.s || []).map(([x, d]) => ({ id: uid(), t: x, done: !!d })), due: o.due == null ? '' : addDays(o.due) }) };
            a(0, 'Audit landing page copy', { t: [1] }); a(0, 'Collect customer quotes', { t: [1], due: 6 });
            a(1, 'Draft new pricing page', { d: 'Three tiers, annual toggle, FAQ underneath.', t: [0], s: [['Sketch tiers', 1], ['Write FAQ'], ['Review with team']], due: 2 });
            a(2, 'Rebuild mobile navigation', { t: [0, 2], s: [['Menu sheet', 1], ['Focus states', 1], ['Test on iOS']], due: -1 });
            a(3, 'Set up analytics events', { t: [2], s: [['Define event names', 1], ['Ship tracking']], due: -3 });
            return { boards: [b], active: b.id, view: 'board' }
        }
        let S = null; try { S = JSON.parse(localStorage.getItem(K)) } catch (e) { }
        if (!S || !Array.isArray(S.boards)) S = seed();
        S.boards.forEach(b => { b.tags = b.tags || []; if (!b.cols || !b.cols.length) b.cols = [{ id: uid(), name: 'Todo', k: 't', cards: [] }]; b.cols.forEach(c => { c.k = c.k || 't'; c.cards.forEach(x => { x.tags = x.tags || []; x.subs = x.subs || []; x.due = x.due || ''; x.desc = x.desc || '' }) }) });
        S.view = S.view === 'list' ? 'list' : 'board';
        if (!S.boards.some(b => b.id === S.active)) S.active = S.boards[0] ? S.boards[0].id : null;
        const save = () => { try { localStorage.setItem(K, JSON.stringify(S)) } catch (e) { } };
        const ui = { edit: null, del: null, adding: null, open: null, focus: 0, editCol: null, filter: null, closed: {}, pop: null, popDel: false }; let tm, popKey = null, noScr = 0;
        const cur = () => S.boards.find(b => b.id === S.active) || null;
        const key = b => b.name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'BRD';
        const hue = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360; return h };
        const tagOf = (b, id) => b.tags.find(t => t.id === id);
        const vis = x => !ui.filter || x.tags.includes(ui.filter);
        const svg = (p, o = '') => `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" ${o}>${p}</svg>`;
        const I = {
            search: svg('<circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/>'),
            side: svg('<rect x="1.75" y="2.25" width="10.5" height="9.5" rx="2"/><path d="M5.25 2.25v9.5"/>'),
            plus: svg('<path d="M7 2.5v9M2.5 7h9"/>'),
            edit: svg('<path d="M9.5 2.5l2 2L5 11l-2.8.8L3 9z"/>'),
            trash: svg('<path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4"/>'),
            desc: svg('<path d="M2.5 4h9M2.5 7h9M2.5 10h5.5"/>'),
            board: svg('<rect x="1.75" y="2.25" width="3" height="9.5" rx="1"/><rect x="5.5" y="2.25" width="3" height="6" rx="1"/><rect x="9.25" y="2.25" width="3" height="8" rx="1"/>'),
            list: svg('<path d="M5.5 3.5h6.5M5.5 7h6.5M5.5 10.5h6.5"/><circle cx="2.6" cy="3.5" r=".5"/><circle cx="2.6" cy="7" r=".5"/><circle cx="2.6" cy="10.5" r=".5"/>'),
            tag: svg('<path d="M1.75 7.2V2.75c0-.5.5-1 1-1H7.2l5 5a.9.9 0 0 1 0 1.3l-3.9 3.9a.9.9 0 0 1-1.3 0z"/><circle cx="4.7" cy="4.7" r=".8" fill="currentColor" stroke="none"/>'),
            cal: svg('<rect x="1.75" y="2.75" width="10.5" height="9.5" rx="2"/><path d="M1.75 5.75h10.5M4.5 1.5v2M9.5 1.5v2"/>'),
            chev: svg('<path d="M4 5.5l3 3 3-3"/>', 'class="chev"'),
            more: '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.1"/><circle cx="7" cy="7" r="1.1"/><circle cx="11" cy="7" r="1.1"/></svg>',
            x: svg('<path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/>'),
            b: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="2 2"><circle cx="7" cy="7" r="5.5"/></svg>',
            t: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--mu)" stroke-width="1.5"><circle cx="7" cy="7" r="5.5"/></svg>',
            p: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--yel)" stroke-width="1.5"/><path d="M7 4a3 3 0 0 1 0 6z" fill="var(--yel)"/></svg>',
            d: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.25" fill="var(--acc)"/><path d="M4.4 7.2l1.9 1.9 3.3-3.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        };
        const KN = { b: 'Backlog', t: 'Todo', p: 'In progress', d: 'Done' };
        function dueInfo(due, done) {
            if (!due) return null; const [y, m, d] = due.split('-').map(Number), dt = new Date(y, m - 1, d); if (isNaN(dt)) return null;
            const t0 = new Date(); t0.setHours(0, 0, 0, 0); const diff = Math.round((dt - t0) / 864e5);
            const l = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : dt.toLocaleDateString(undefined, dt.getFullYear() !== t0.getFullYear() ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
            return { l, cls: done ? 'dn' : diff < 0 ? 'od' : diff <= 1 ? 'soon' : '' }
        }
        const ring = (d, n) => { const c = 31.4; return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke-width="1.6"><circle cx="7" cy="7" r="5" stroke="var(--line2)"/><circle cx="7" cy="7" r="5" stroke="var(--acc)" stroke-dasharray="${c * d / n} ${c}" transform="rotate(-90 7 7)"/></svg>` };
        function meta(b, x, col) {
            const tg = x.tags.map(id => tagOf(b, id)).filter(Boolean), n = x.subs.length, dn = x.subs.filter(s => s.done).length, di = dueInfo(x.due, col.k === 'd');
            return {
                tags: tg.map(t => `<button class="tag${ui.filter === t.id ? ' on' : ''}" style="--h:${t.h}" data-a="tf" data-t="${t.id}" title="Filter by ${esc(t.name)}"><i class="dot"></i><span>${esc(t.name)}</span></button>`).join(''),
                subs: n ? `<span class="sp" title="${dn} of ${n} subtasks done">${ring(dn, n)}${dn}/${n}</span>` : '',
                due: di ? `<span class="due ${di.cls}">${I.cal}${di.l}</span>` : ''
            }
        }
        function find(id) { const b = cur(); if (!b) return null; for (const col of b.cols) { const c = col.cards.find(x => x.id === id); if (c) return { c, col } } return null }
        function mv(id, colId, beforeId) {
            const b = cur(); let card; for (const c of b.cols) { const i = c.cards.findIndex(x => x.id === id); if (i > -1) { card = c.cards.splice(i, 1)[0]; break } }
            const to = b.cols.find(c => c.id === colId); if (!card || !to) return; const j = beforeId ? to.cards.findIndex(x => x.id === beforeId) : -1; if (j < 0) to.cards.push(card); else to.cards.splice(j, 0, card)
        }
        const cardHtml = (b, c, x) => { const m = meta(b, x, c); return `<div class="card${x.id === ui.land ? ' land' : ''}${x.id === ui.flash ? ' flash' : ''}" draggable="true" tabindex="0" data-a="oc" data-id="${x.id}"><div class="cid">${key(b)}-${x.num}${x.desc ? I.desc : ''}</div><div class="t">${esc(x.title)}</div>${m.tags || m.subs || m.due ? `<div class="meta">${m.tags}${m.subs}${m.due}</div>` : ''}</div>` };
        const rowHtml = (b, c, x) => { const m = meta(b, x, c), dn = c.k === 'd'; return `<div class="row${dn ? ' dn' : ''}${x.id === ui.land ? ' land' : ''}${x.id === ui.flash ? ' flash' : ''}" tabindex="0" data-a="oc" data-id="${x.id}"><button class="st" data-a="td" data-id="${x.id}" title="${dn ? 'Reopen' : 'Mark done'}" aria-label="${dn ? 'Reopen card' : 'Mark card done'}">${I[c.k] || I.t}</button><span class="rid">${key(b)}-${x.num}</span><span class="rt">${esc(x.title)}</span><span class="rm">${m.tags}${m.subs}${m.due}</span></div>` };
        const addHtml = c => ui.adding === c.id ? `<textarea class="cp" rows="2" data-in="cp" data-c="${c.id}" data-af placeholder="Card title"></textarea><div class="hint">Enter to add, Esc to cancel</div>` : `<button class="addb" data-a="ac" data-c="${c.id}">${I.plus}Add card</button>`;
        function colHead(c, n, lv) {
            const nm = ui.editCol === c.id ? `<input class="ri" data-in="rc" data-c="${c.id}" data-af value="${esc(c.name)}" aria-label="Column name">` : `<b>${esc(c.name)}</b>`;
            return `<div class="${lv ? 'lh' : 'ch'}"${lv ? ` data-a="tc" data-c="${c.id}" tabindex="0" role="button"` : ''}>${lv ? I.chev : ''}${I[c.k] || I.t}${nm}<span class="c">${n}</span><span class="sp2"></span><button class="ib" data-a="cmn" data-c="${c.id}" data-pk="col:${c.id}" title="Column options" aria-label="Column options">${I.more}</button><button class="ib" data-a="ac" data-c="${c.id}" title="Add card" aria-label="Add card to ${esc(c.name)}">${I.plus}</button></div>`
        }
        const boardHtml = b => `<div class="cols">` + b.cols.map(c => { const cards = c.cards.filter(vis); return `<section class="col" data-c="${c.id}">${colHead(c, cards.length, false)}<div class="list" data-c="${c.id}">${cards.map(x => cardHtml(b, c, x)).join('')}</div>${addHtml(c)}</section>` }).join('') + `<button class="addcol" data-a="ncol">${I.plus}Add column</button></div>`;
        const listHtml = b => `<div class="lv"><div class="lvin">` + b.cols.map(c => {
            const cards = c.cards.filter(vis), cl = ui.closed[c.id] && ui.adding !== c.id;
            return `<section class="ls${cl ? ' closed' : ''}" data-c="${c.id}">${colHead(c, cards.length, true)}` + (cl ? '' : (cards.length ? cards.map(x => rowHtml(b, c, x)).join('') : (ui.adding === c.id ? '' : '<div class="lempty">No cards</div>')) + `<div class="ladd">${addHtml(c)}</div>`) + `</section>`
        }).join('') + `<button class="addcol lac" data-a="ncol">${I.plus}Add column</button></div></div>`;
        let lastB = null;
        function render() {
            noScr = Date.now() + 200;
            const b = cur();
            const old = document.querySelector('.cols,.lv'), same = old && lastB === S.active && old.classList.contains(S.view === 'list' ? 'lv' : 'cols'); lastB = S.active;
            const sx = same ? old.scrollLeft : 0, sy = same ? old.scrollTop : 0, ls = {}; if (same) document.querySelectorAll('.list').forEach(l => ls[l.dataset.c] = l.scrollTop);
            $('app').classList.toggle('collapsed', !!S.collapsed && !!b);
            $('sidein').innerHTML = `<div class="s0"><a class="brand" href="index.html" title="Veylo home"><svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#5e6ad2"/><path d="M9 10.5l7 12 7-12" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Veylo</a><button class="ib" data-a="tg" title="Hide sidebar ([)" aria-label="Hide sidebar">${I.side}</button></div><button class="sbtn" data-a="sr">${I.search}Search<kbd>${MAC ? '⌘K' : 'Ctrl K'}</kbd></button><div class="sh"><span>Boards</span><button class="ib" data-a="nb" title="New board" aria-label="New board">${I.plus}</button></div>` +
                S.boards.map(x => `<div class="bi${x.id === S.active ? ' on' : ''}" tabindex="0" data-a="sb" data-id="${x.id}"><span class="sq" style="background:hsl(${hue(x.id)} 45% 46%)">${esc((x.name[0] || 'B').toUpperCase())}</span>` +
                    (ui.edit === x.id ? `<input class="ri" data-in="rn" data-id="${x.id}" data-af value="${esc(x.name)}" aria-label="Board name">` :
                        `<span class="n">${esc(x.name)}</span><span class="acts"><button class="ib" data-a="eb" data-id="${x.id}" title="Rename board" aria-label="Rename board">${I.edit}</button>` +
                        (ui.del === x.id ? `<button class="ib del" data-a="db" data-id="${x.id}">Delete?</button>` : `<button class="ib" data-a="db" data-id="${x.id}" title="Delete board" aria-label="Delete board">${I.trash}</button>`) + `</span>`) + `</div>`).join('') + `<div class="sf"><a href="privacy.html">Privacy policy</a><a href="impressum.html">Impressum</a></div>`;
            if (!b) { $('main').innerHTML = `<div class="empty"><p>No boards yet</p><span>Create a board to start organizing your work.</span><button class="btn pri" data-a="nb">New board</button></div>`; return fin() }
            if (ui.filter && !tagOf(b, ui.filter)) ui.filter = null;
            const all = b.cols.reduce((n, c) => n + c.cards.length, 0), shown = b.cols.reduce((n, c) => n + c.cards.filter(vis).length, 0), ft = ui.filter && tagOf(b, ui.filter);
            const cnt = ui.filter ? `${shown} of ${all} cards` : `${all} ${all === 1 ? 'card' : 'cards'}`;
            const top = `<div class="top"><button class="ib tg" data-a="tg" title="Show sidebar ([)" aria-label="Show sidebar">${I.side}</button><b>${esc(b.name)}</b><span class="cnt">${cnt}</span>${ft ? `<button class="fchip" data-a="cf" title="Clear filter"><i class="dot" style="--h:${ft.h}"></i><span>${esc(ft.name)}</span>${I.x}</button>` : ''}<span class="sp2"></span>` +
                `<button class="btn" data-a="tgm" data-pk="tags" title="Manage tags">${I.tag}<span class="lb">Tags</span></button>` +
                `<div class="seg" role="group" aria-label="View"><button class="${S.view === 'board' ? 'on' : ''}" data-a="vw" data-v="board" title="Board view (V)" aria-label="Board view" aria-pressed="${S.view === 'board'}">${I.board}</button><button class="${S.view === 'list' ? 'on' : ''}" data-a="vw" data-v="list" title="List view (V)" aria-label="List view" aria-pressed="${S.view === 'list'}">${I.list}</button></div>` +
                `<button class="ib" data-a="sr" title="Search" aria-label="Search">${I.search}</button><button class="btn pri" data-a="ac" data-c="${b.cols[0].id}">New card <kbd>C</kbd></button></div>`;
            $('main').innerHTML = top + (S.view === 'list' ? listHtml(b) : boardHtml(b));
            const nw = document.querySelector('.cols,.lv'); if (nw) { nw.scrollLeft = sx; nw.scrollTop = sy }
            document.querySelectorAll('.list').forEach(l => { if (ls[l.dataset.c]) l.scrollTop = ls[l.dataset.c] });
            fin()
        }
        function fin() {
            if (ui.focus) { ui.focus = 0; const f = document.querySelector('[data-af]'); if (f) { f.focus(); if (f.tagName === 'INPUT') f.select() } }
            if (ui.flash) { const el = document.querySelector('.card[data-id="' + ui.flash + '"],.row[data-id="' + ui.flash + '"]'); if (el) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); ui.flash = null }
            if (ui.ref) { const r = document.querySelector('.card[data-id="' + ui.ref + '"],.row[data-id="' + ui.ref + '"]'); if (r) r.focus(); ui.ref = null }
            ui.land = null
        }
        function openM(fs) {
            const b = cur(), f = find(ui.open); if (!f) { closeM(); return }
            const c = f.c, old = document.querySelector('.dlg'), sc = old ? old.scrollTop : 0, n = c.subs.length, dn = c.subs.filter(s => s.done).length;
            $('modal').innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="Edit card"><div class="dh"><span class="cid" style="margin:0">${key(b)}-${c.num}</span><select id="st" aria-label="Status">${b.cols.map(x => `<option value="${x.id}"${x.id === f.col.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` +
                `<input id="mt" class="mt" value="${esc(c.title)}" placeholder="Card title" aria-label="Card title"><textarea id="md" class="md" placeholder="Add a description" aria-label="Description">${esc(c.desc)}</textarea>` +
                `<div class="mrow"><span class="ml">Due date</span><span class="dw"><input type="date" id="dd" value="${esc(c.due)}" aria-label="Due date"><button class="ib" id="dcl" data-a="cd" title="Clear due date" aria-label="Clear due date"${c.due ? '' : ' hidden'}>${I.x}</button></span></div>` +
                `<div class="mrow"><span class="ml">Tags</span><div class="tags">${b.tags.map(t => `<button class="chip${c.tags.includes(t.id) ? ' on' : ''}" style="--h:${t.h}" data-a="tt" data-t="${t.id}" aria-pressed="${c.tags.includes(t.id)}"><i class="dot"></i>${esc(t.name)}</button>`).join('')}<input id="ta" class="tin" data-in="ta" placeholder="Add tag…" aria-label="Add tag"></div></div>` +
                `<div class="msec"><div class="msh">Subtasks${n ? `<em>${dn}/${n}</em>` : ''}</div>${n ? `<div class="pbar"><i style="width:${dn / n * 100}%"></i></div>` : ''}` +
                c.subs.map(s => `<div class="sr${s.done ? ' dn' : ''}"><button class="ck" data-a="ts" data-s="${s.id}" role="checkbox" aria-checked="${s.done}" aria-label="Toggle subtask">${s.done ? I.d : I.t}</button><input class="si" data-in="si" data-s="${s.id}" value="${esc(s.t)}" aria-label="Subtask"><button class="ib" data-a="sd" data-s="${s.id}" title="Delete subtask" aria-label="Delete subtask">${I.x}</button></div>`).join('') +
                `<div class="sadd"><span class="pl2">${I.plus}</span><input id="sa" class="sain" data-in="sa" placeholder="Add subtask" aria-label="Add subtask"></div></div>` +
                `<div class="df"><button class="btn danger" data-a="dc">Delete card</button><button class="btn" data-a="cm">Close</button></div></div>`;
            $('modal').hidden = false; const d = document.querySelector('.dlg'); d.scrollTop = sc; if (fs && $(fs)) $(fs).focus()
        }
        function closeM() { const f = find(ui.open); if (f) { f.c.subs = f.c.subs.filter(s => s.t.trim()); if (!f.c.title.trim()) f.c.title = 'Untitled card'; save() } ui.open = null; $('modal').hidden = true; $('modal').innerHTML = ''; render() }
        function addFrom(t) { const v = t.value.trim(); t.value = ''; const b = cur(), col = b && b.cols.find(c => c.id === t.dataset.c); if (!v || !col) return; b.n++; const nid = uid(); col.cards.push({ id: nid, num: b.n, title: v, desc: '', tags: ui.filter ? [ui.filter] : [], subs: [], due: '' }); ui.land = nid; save() }
        function commitRn(t) { const b = S.boards.find(x => x.id === t.dataset.id), v = t.value.trim(); if (b && v) b.name = v; ui.edit = null; save() }
        function commitRc(t) { const b = cur(), c = b && b.cols.find(x => x.id === t.dataset.c), v = t.value.trim(); if (c && v) c.name = v; ui.editCol = null; save() }
        function openPop(type, id, el) { const r = el.getBoundingClientRect(); ui.pop = { type, id, r: { rt: r.right, b: r.bottom } }; ui.popDel = false; popKey = el.dataset.pk; drawPop() }
        function closePop() { ui.pop = null; popKey = null; ui.popDel = false; $('pop').hidden = true; $('pop').innerHTML = '' }
        function drawPop() {
            const p = ui.pop, b = cur(); if (!p || !b) { closePop(); return } let h = '';
            if (p.type === 'col') {
                const c = b.cols.find(x => x.id === p.id); if (!c) { closePop(); return }
                const i = b.cols.indexOf(c), n = b.cols.length, to = b.cols[i > 0 ? i - 1 : 1];
                h = `<button class="mi" data-a="crn"><span class="mic">${I.edit}</span>Rename</button><div class="mlab">Status icon</div><div class="icrow">${['b', 't', 'p', 'd'].map(k => `<button class="${c.k === k ? 'on' : ''}" data-a="cik" data-k="${k}" title="${KN[k]}" aria-label="${KN[k]} icon">${I[k]}</button>`).join('')}</div>` +
                    `<button class="mi" data-a="cml"${i === 0 ? ' disabled' : ''}><span class="mic">←</span>Move left</button><button class="mi" data-a="cmr"${i === n - 1 ? ' disabled' : ''}><span class="mic">→</span>Move right</button>` +
                    (n > 1 ? `<button class="mi red" data-a="cdl"><span class="mic">${I.trash}</span>${ui.popDel ? 'Confirm delete' : 'Delete column'}</button>` + (ui.popDel ? `<div class="pnote">${c.cards.length ? `Its ${c.cards.length} ${c.cards.length === 1 ? 'card moves' : 'cards move'} to “${esc(to.name)}”.` : 'This column is empty.'}</div>` : '') : '')
            }
            else { h = `<div class="mlab">Board tags</div>` + (b.tags.length ? b.tags.map(t => `<div class="tr"><button class="dotb" data-a="tcol" data-t="${t.id}" title="Change color" aria-label="Change color"><i class="dot" style="--h:${t.h}"></i></button><input class="ti" data-in="tn" data-t="${t.id}" value="${esc(t.name)}" aria-label="Tag name"><button class="ib" data-a="tdl" data-t="${t.id}" title="Delete tag" aria-label="Delete tag">${I.trash}</button></div>`).join('') : '<div class="pnote">No tags yet. Add one below, or from inside a card.</div>') + `<div class="tr"><span class="dotb">${I.plus}</span><input class="ti" data-in="tnew" placeholder="New tag" aria-label="New tag"></div>` }
            const el = $('pop'); el.innerHTML = h; el.hidden = false; const w = el.offsetWidth, hh = el.offsetHeight;
            let l = Math.max(8, Math.min(p.r.rt - w, innerWidth - w - 8)), t = p.r.b + 4; if (t + hh > innerHeight - 8) t = Math.max(8, innerHeight - hh - 8);
            el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.maxHeight = (innerHeight - 16) + 'px'
        }
        document.addEventListener('click', e => {
            if (ui.pop && !e.target.closest('#pop')) { const k = popKey; closePop(); if (k && e.target.closest('[data-pk="' + k + '"]')) return }
            if (e.target.id === 'modal') { closeM(); return }
            if (e.target.id === 'pal') { closeP(); return }
            if (e.target.closest('input,textarea,select')) return;
            const t = e.target.closest('[data-a]'); if (!t) return;
            const a = t.dataset.a, id = t.dataset.id;
            if (a === 'cmn' || a === 'tgm') { openPop(a === 'cmn' ? 'col' : 'tags', t.dataset.c || null, t); if (ui.adding) { ui.adding = null; render() } return }
            if (a !== 'ac') ui.adding = null; if (a !== 'db') ui.del = null;
            if (a === 'sr') { openP(); return }
            if (a === 'pr') { runP(+t.dataset.i); return }
            if (a === 'cm') { closeM(); return }
            if (a === 'oc') { ui.open = id; openM('mt'); return }
            if (a === 'tt' || a === 'ts' || a === 'sd' || a === 'cd') {
                const f = find(ui.open); if (!f) return; const c = f.c; let rf = null;
                if (a === 'tt') { const i = c.tags.indexOf(t.dataset.t); if (i > -1) c.tags.splice(i, 1); else c.tags.push(t.dataset.t); rf = '.chip[data-t="' + t.dataset.t + '"]' }
                else if (a === 'ts') { const s = c.subs.find(x => x.id === t.dataset.s); if (s) s.done = !s.done; rf = '.ck[data-s="' + t.dataset.s + '"]' }
                else if (a === 'sd') { c.subs = c.subs.filter(x => x.id !== t.dataset.s) }
                else { c.due = ''; $('dd').value = ''; $('dcl').hidden = true }
                save(); render(); if (a !== 'cd') { openM(); if (rf) { const r = document.querySelector('.dlg ' + rf); if (r) r.focus() } } return
            }
            if (a === 'nb') { const nb = mk('Untitled board'); S.boards.push(nb); S.active = nb.id; ui.edit = nb.id; ui.focus = 1; ui.filter = null; S.collapsed = false }
            else if (a === 'sb') { if (ui.edit && ui.edit !== id) ui.edit = null; if (S.active !== id) ui.filter = null; S.active = id }
            else if (a === 'eb') { ui.edit = id; ui.focus = 1 }
            else if (a === 'tg') { S.collapsed = !S.collapsed }
            else if (a === 'vw') { S.view = t.dataset.v === 'list' ? 'list' : 'board' }
            else if (a === 'tf') { ui.filter = ui.filter === t.dataset.t ? null : t.dataset.t }
            else if (a === 'cf') { ui.filter = null }
            else if (a === 'tc') { ui.closed[t.dataset.c] = !ui.closed[t.dataset.c] }
            else if (a === 'td') { const b = cur(), f = find(id); if (b && f) { const to = f.col.k === 'd' ? b.cols.find(c => c.k !== 'd') : b.cols.find(c => c.k === 'd'); if (to && to !== f.col) { mv(id, to.id); ui.land = id } } }
            else if (a === 'db') {
                if (ui.del === id) { S.boards = S.boards.filter(x => x.id !== id); if (S.active === id) S.active = S.boards[0] ? S.boards[0].id : null; ui.del = null; ui.filter = null }
                else { ui.del = id; clearTimeout(tm); tm = setTimeout(() => { ui.del = null; render() }, 3000) }
            }
            else if (a === 'ac') { ui.adding = t.dataset.c; ui.closed[t.dataset.c] = false; ui.focus = 1 }
            else if (a === 'ncol') { const b = cur(); if (b) { const c = { id: uid(), name: 'New column', k: 't', cards: [] }; b.cols.push(c); ui.editCol = c.id; ui.focus = 1 } }
            else if (a === 'dc') { const f = find(ui.open); if (f) f.col.cards = f.col.cards.filter(x => x !== f.c); ui.open = null; $('modal').hidden = true; $('modal').innerHTML = '' }
            else if (ui.pop && ui.pop.type === 'col') {
                const b = cur(), i = b ? b.cols.findIndex(c => c.id === ui.pop.id) : -1;
                if (i > -1) {
                    const c = b.cols[i];
                    if (a === 'crn') { ui.editCol = c.id; ui.focus = 1; closePop() }
                    else if (a === 'cik') { c.k = t.dataset.k }
                    else if (a === 'cml' || a === 'cmr') { const j = i + (a === 'cml' ? -1 : 1); if (b.cols[j]) [b.cols[i], b.cols[j]] = [b.cols[j], b.cols[i]]; closePop() }
                    else if (a === 'cdl' && b.cols.length > 1) { if (!ui.popDel) ui.popDel = true; else { const to = b.cols[i > 0 ? i - 1 : 1]; to.cards.push(...c.cards); b.cols.splice(i, 1); closePop() } }
                }
            }
            else if (ui.pop && ui.pop.type === 'tags') {
                const b = cur();
                if (a === 'tcol') { const tg = b && tagOf(b, t.dataset.t); if (tg) tg.h = HUES[(HUES.indexOf(tg.h) + 1) % HUES.length] }
                else if (a === 'tdl' && b) { const tid = t.dataset.t; b.tags = b.tags.filter(o => o.id !== tid); b.cols.forEach(c => c.cards.forEach(x => { x.tags = x.tags.filter(i => i !== tid) })); if (ui.filter === tid) ui.filter = null }
            }
            save(); render(); if (ui.pop) drawPop()
        });
        document.addEventListener('input', e => {
            const t = e.target;
            if (t.id === 'pq') { P.q = t.value; P.i = 0; P.items = calc(); drawP(); return }
            const f = ui.open && find(ui.open); if (!f) return;
            if (t.id === 'mt') { f.c.title = t.value; save(); render() }
            else if (t.id === 'md') { f.c.desc = t.value; save(); render() }
            else if (t.dataset.in === 'si') { const s = f.c.subs.find(x => x.id === t.dataset.s); if (s) { s.t = t.value; save() } }
        });
        document.addEventListener('change', e => {
            const t = e.target;
            if (t.id === 'st') { mv(ui.open, t.value); save(); render(); return }
            if (t.id === 'dd') { const f = find(ui.open); if (f) { f.c.due = t.value; $('dcl').hidden = !t.value; save(); render() } return }
            if (t.dataset.in === 'tn') { const b = cur(), tg = b && tagOf(b, t.dataset.t), v = t.value.trim(); if (tg) { if (v && !b.tags.some(o => o !== tg && o.name.toLowerCase() === v.toLowerCase())) tg.name = v; else t.value = tg.name; save(); render() } }
        });
        document.addEventListener('keydown', e => {
            const t = e.target, d = t.dataset && t.dataset.in;
            if (d === 'cp') { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addFrom(t); ui.focus = 1; render() } else if (e.key === 'Escape') { ui.adding = null; render() } return }
            if (d === 'rn') { if (e.key === 'Enter') { commitRn(t); render() } else if (e.key === 'Escape') { ui.edit = null; render() } return }
            if (d === 'rc') { if (e.key === 'Enter') { commitRc(t); render() } else if (e.key === 'Escape') { ui.editCol = null; render() } return }
            if (d === 'pq') { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = P.items.length || 1; P.i = (P.i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; drawP() } else if (e.key === 'Enter') { e.preventDefault(); runP(P.i) } else if (e.key === 'Escape') { closeP() } return }
            if (d === 'tnew') { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const b = cur(), v = t.value.trim(); if (b && v) { if (!b.tags.some(o => o.name.toLowerCase() === v.toLowerCase())) b.tags.push({ id: uid(), name: v, h: HUES[b.tags.length % HUES.length] }); save(); render(); drawPop(); const n = document.querySelector('#pop [data-in="tnew"]'); if (n) n.focus() } } else if (e.key === 'Escape') { closePop() } return }
            if (d === 'tn') { if (e.key === 'Enter') { e.preventDefault(); t.blur() } else if (e.key === 'Escape') { const tg = tagOf(cur(), t.dataset.t); if (tg) t.value = tg.name; closePop() } return }
            if ((d === 'ta' || d === 'sa' || d === 'si') && e.key === 'Enter' && !e.isComposing) {
                e.preventDefault(); const f = find(ui.open); if (f) {
                    if (d === 'ta') { const b = cur(), v = t.value.trim(); if (v) { let tg = b.tags.find(o => o.name.toLowerCase() === v.toLowerCase()); if (!tg) { tg = { id: uid(), name: v, h: HUES[b.tags.length % HUES.length] }; b.tags.push(tg) } if (!f.c.tags.includes(tg.id)) f.c.tags.push(tg.id); save(); render(); openM('ta') } }
                    else if (d === 'sa') { const v = t.value.trim(); if (v) { f.c.subs.push({ id: uid(), t: v, done: false }); save(); render(); openM('sa') } }
                    else { $('sa').focus() }
                } return
            }
            if (e.key === 'Escape' && ui.pop) { closePop(); return }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('pal').hidden ? openP() : closeP(); return }
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && t.matches && t.matches('.card,.row')) { e.preventDefault(); const b = cur(), f = find(t.dataset.id); if (b && f) { const j = b.cols.indexOf(f.col) + (e.key === 'ArrowRight' ? 1 : -1); if (b.cols[j]) { ui.land = ui.ref = f.c.id; mv(f.c.id, b.cols[j].id); save(); render() } } return }
            if (!e.metaKey && !e.ctrlKey && !e.altKey && $('pal').hidden && $('modal').hidden && !(t.closest && t.closest('input,textarea,select'))) {
                if (e.key === '/') { e.preventDefault(); openP(); return }
                if (e.key === '[') { S.collapsed = !S.collapsed; save(); render(); return }
                if ((e.key === 'v' || e.key === 'V') && cur()) { S.view = S.view === 'board' ? 'list' : 'board'; save(); render(); return }
            }
            if (e.key === 'Escape' && !$('modal').hidden) { closeM(); return }
            if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('div[data-a]')) { e.preventDefault(); t.click(); return }
            if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey && !t.closest('input,textarea,select') && $('modal').hidden && $('pal').hidden) { const b = cur(); if (b) { e.preventDefault(); ui.adding = b.cols[0].id; ui.closed[b.cols[0].id] = false; ui.focus = 1; render() } }
        });
        document.addEventListener('focusout', e => {
            const t = e.target, d = t.dataset && t.dataset.in; if (!d) return; const rt = e.relatedTarget, keep = rt && rt.closest && rt.closest('[data-a]');
            if (d === 'cp' && ui.adding === t.dataset.c) { addFrom(t); ui.adding = null; if (!keep) render() }
            if (d === 'rn' && ui.edit === t.dataset.id) { commitRn(t); if (!keep) render() }
            if (d === 'rc' && ui.editCol === t.dataset.c) { commitRc(t); if (!keep) render() }
        });
        window.addEventListener('resize', () => { if (ui.pop) closePop() });
        document.addEventListener('scroll', e => { if (ui.pop && Date.now() > noScr && !(e.target.nodeType === 1 && e.target.closest('#pop'))) closePop() }, true);
        let drag = null; const ind = document.createElement('div'); ind.className = 'ind';
        const clr = () => { ind.remove(); document.querySelectorAll('.col.over').forEach(c => c.classList.remove('over')) };
        document.addEventListener('dragstart', e => {
            const c = e.target.closest && e.target.closest('.card'); if (!c) return; drag = c.dataset.id;
            const r = c.getBoundingClientRect(); ind.style.height = r.height + 'px';
            const g = c.cloneNode(true); g.className = 'card ghost'; g.style.width = r.width + 'px'; document.body.appendChild(g);
            e.dataTransfer.setDragImage(g, e.clientX - r.left, e.clientY - r.top); setTimeout(() => g.remove(), 0);
            e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => c.classList.add('drag'), 0)
        });
        document.addEventListener('dragover', e => {
            if (!drag) return;
            const cs = document.querySelector('.cols'); if (cs) { const r = cs.getBoundingClientRect(); if (e.clientX < r.left + 70) cs.scrollLeft -= 16; else if (e.clientX > r.right - 70) cs.scrollLeft += 16 }
            const col = e.target.closest('.col'); if (!col) return; e.preventDefault();
            const l = col.querySelector('.list'), lr = l.getBoundingClientRect(); if (e.clientY < lr.top + 40) l.scrollTop -= 10; else if (e.clientY > lr.bottom - 40) l.scrollTop += 10;
            const next = [...l.querySelectorAll('.card:not(.drag)')].find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 }) || null;
            document.querySelectorAll('.col.over').forEach(c => c !== col && c.classList.remove('over')); col.classList.add('over');
            let ns = ind.nextElementSibling; while (ns && ns.classList.contains('drag')) ns = ns.nextElementSibling;
            if (ind.parentNode !== l || ns !== next) l.insertBefore(ind, next)
        });
        document.addEventListener('drop', e => {
            if (!drag || !ind.parentNode) return; e.preventDefault();
            const l = ind.parentNode; let n = ind.nextElementSibling; while (n && !(n.classList.contains('card') && !n.classList.contains('drag'))) n = n.nextElementSibling;
            ui.land = drag; mv(drag, l.dataset.c, n ? n.dataset.id : null); save()
        });
        document.addEventListener('dragend', () => { drag = null; clr(); render() });
        const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        const P = { q: '', i: 0, items: [] };
        function fz(q, s) {
            q = q.toLowerCase(); const l = s.toLowerCase(), sub = l.indexOf(q);
            if (sub > -1) return { sc: 30 + (sub === 0 ? 12 : /[\s\-_]/.test(l[sub - 1]) ? 6 : 0) - l.length * .05, idx: Array.from({ length: q.length }, (_, k) => sub + k) };
            let i = 0, sc = 0, last = -2; const idx = [];
            for (let j = 0; j < l.length && i < q.length; j++)if (l[j] === q[i]) { idx.push(j); sc += (j === 0 || /[\s\-_]/.test(l[j - 1])) ? 6 : 1; if (j === last + 1) sc += 4; last = j; i++ }
            return i < q.length ? null : { sc: sc - l.length * .05, idx }
        }
        function hl(s, idx) { if (!idx || !idx.length) return esc(s); const set = new Set(idx); let o = '', on = false; for (let k = 0; k < s.length; k++) { const m = set.has(k); if (m && !on) { o += '<mark>'; on = true } if (!m && on) { o += '</mark>'; on = false } o += esc(s[k]) } return o + (on ? '</mark>' : '') }
        function calc() {
            const q = P.q.trim(), b0 = cur();
            const acts = [{ t: 'act', l: 'New board', k: 'nb', ic: I.plus }]; if (b0) { acts.push({ t: 'act', l: 'New card', k: 'nc', ic: I.plus }); acts.push({ t: 'act', l: S.view === 'board' ? 'Switch to list view' : 'Switch to board view', k: 'vw', ic: S.view === 'board' ? I.list : I.board }) }
            acts.push({ t: 'act', l: S.collapsed ? 'Show sidebar' : 'Hide sidebar', k: 'tg', ic: I.side });
            const bs = S.boards.map(b => ({ t: 'board', l: b.name, id: b.id }));
            if (!q) return [...bs.slice(0, 6), ...acts];
            const top = (a, n) => a.filter(o => o.m).sort((x, y) => y.m.sc - x.m.sc).slice(0, n).map(o => ({ ...o.x, idx: o.m.idx }));
            const cs = []; S.boards.forEach(b => b.cols.forEach(c => c.cards.forEach(x => {
                const cid = key(b) + '-' + x.num, tm = fz(q, x.title), im = fz(q, cid), dm = x.desc && fz(q, x.desc), tg = x.tags.map(id => { const o = tagOf(b, id); return o ? o.name : '' }).join(' '), gm = tg && fz(q, tg);
                const m = tm ? { sc: tm.sc + 10, idx: tm.idx } : im ? { sc: im.sc, idx: null } : gm ? { sc: gm.sc * .5, idx: null } : dm ? { sc: dm.sc * .4, idx: null } : null;
                cs.push({ x: { t: 'card', l: x.title, id: x.id, b: b.id, bn: b.name + (!tm && !im && gm ? ' (tag)' : !tm && !im && dm ? ' (description)' : ''), k: c.k, cid }, m })
            })));
            return [...top(bs.map(x => ({ x, m: fz(q, x.l) })), 5), ...top(cs, 8), ...top(acts.map(x => ({ x, m: fz(q, x.l) })), 3)]
        }
        function drawP() {
            const el = $('pl'); if (!el) return;
            if (!P.items.length) { el.innerHTML = `<div class="pe">No results for “${esc(P.q)}”. Try a card title, tag, board name, or card ID.</div>`; return }
            let h = '', g = ''; P.items.forEach((x, i) => {
                const gl = { board: 'Boards', card: 'Cards', act: 'Actions' }[x.t]; if (gl !== g) { g = gl; h += `<div class="pg">${gl}</div>` }
                const ic = x.t === 'board' ? `<span class="sq" style="background:hsl(${hue(x.id)} 45% 46%)">${esc((x.l[0] || 'B').toUpperCase())}</span>` : x.t === 'card' ? (I[x.k] || I.t) : x.ic;
                h += `<div class="pi${i === P.i ? ' on' : ''}" role="option" data-a="pr" data-i="${i}"><span class="pic">${ic}</span>${x.t === 'card' ? `<span class="pid">${x.cid}</span>` : ''}<span class="pt">${hl(x.l, x.idx)}</span><span class="pm">${x.t === 'card' ? esc(x.bn) : ''}</span></div>`
            });
            el.innerHTML = h; const on = el.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' })
        }
        function openP() {
            if (!$('modal').hidden) closeM(); closePop(); P.q = ''; P.i = 0;
            $('pal').innerHTML = `<div class="pd" role="dialog" aria-modal="true" aria-label="Search"><div class="ph">${I.search}<input id="pq" data-in="pq" placeholder="Search cards, tags, boards, and actions" autocomplete="off" spellcheck="false" aria-label="Search"><kbd>Esc</kbd></div><div class="pl" id="pl" role="listbox"></div></div>`;
            $('pal').hidden = false; P.items = calc(); drawP(); $('pq').focus()
        }
        function closeP() { $('pal').hidden = true; $('pal').innerHTML = '' }
        function runP(i) {
            const x = P.items[i]; if (!x) return; closeP();
            if (x.t === 'board') { if (S.active !== x.id) ui.filter = null; S.active = x.id }
            else if (x.t === 'card') { S.active = x.b; ui.flash = x.id; ui.filter = null }
            else if (x.k === 'nb') { const nb = mk('Untitled board'); S.boards.push(nb); S.active = nb.id; ui.edit = nb.id; ui.focus = 1; ui.filter = null; S.collapsed = false }
            else if (x.k === 'nc') { const b = cur(); if (b) { ui.adding = b.cols[0].id; ui.closed[b.cols[0].id] = false; ui.focus = 1 } }
            else if (x.k === 'vw') S.view = S.view === 'board' ? 'list' : 'board';
            else if (x.k === 'tg') S.collapsed = !S.collapsed;
            save(); render()
        }
        document.addEventListener('mouseover', e => { const r = e.target.closest && e.target.closest('.pi'); if (!r || +r.dataset.i === P.i) return; P.i = +r.dataset.i; document.querySelectorAll('.pi.on').forEach(x => x.classList.remove('on')); r.classList.add('on') });
        render();
