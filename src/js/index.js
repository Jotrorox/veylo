        (function () {
            var COLS = [{ k: 't', name: 'Todo' }, { k: 'p', name: 'In progress' }, { k: 'd', name: 'Done' }];
            var ICON = {
                t: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--mute)" aria-hidden="true"><circle cx="7" cy="7" r="5.5"/></svg>',
                p: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--warn)" stroke-width="1.5"/><path d="M7 4a3 3 0 0 1 0 6z" fill="var(--warn)"/></svg>',
                d: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6.25" fill="var(--accent)"/><path d="M4.4 7.2l1.9 1.9 3.3-3.6" fill="none" stroke="var(--accent-ink)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            };
            var CAL = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="1.75" y="2.75" width="10.5" height="9.5" rx="2"/><path d="M1.75 5.75h10.5M4.5 1.5v2M9.5 1.5v2"/></svg>';
            var cards = [
                { id: 1, t: 'Draft the pricing page', col: 0, tags: [['Design', 270]], sub: [1, 3], due: ['Tomorrow', 'soon'] },
                { id: 2, t: 'Write the launch email', col: 0, tags: [['Copy', 30]], due: ['Today', 'soon'] },
                { id: 3, t: 'Interview five customers', col: 0, tags: [['Research', 160]] },
                { id: 4, t: 'Rebuild mobile navigation', col: 1, tags: [['Design', 270], ['Dev', 210]], sub: [2, 3], due: ['Yesterday', 'od'] },
                { id: 5, t: 'Set up analytics events', col: 2, tags: [['Dev', 210]], sub: [2, 2], due: ['Monday', ''] }
            ];
            var landed = null, root = document.getElementById('cols');
            function ring(d, n) { var c = 31.4; return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="var(--line)"/><circle cx="7" cy="7" r="5" stroke="var(--accent)" stroke-dasharray="' + (c * d / n) + ' ' + c + '" transform="rotate(-90 7 7)"/></svg>' }
            function cardHtml(c) {
                var done = c.col === 2, m = '';
                m += c.tags.map(function (t) { return '<span class="tag"><i class="dot" style="--h:' + t[1] + '"></i>' + t[0] + '</span>' }).join('');
                if (c.sub) m += '<span class="sp">' + ring(c.sub[0], c.sub[1]) + c.sub[0] + '/' + c.sub[1] + '</span>';
                if (c.due) m += '<span class="due ' + (done ? 'dn' : c.due[1]) + '">' + CAL + c.due[0] + '</span>';
                var next = COLS[(c.col + 1) % 3].name;
                return '<button type="button" class="card' + (done ? ' done' : '') + (c.id === landed ? ' land' : '') + '" data-id="' + c.id + '" aria-label="' + c.t + '. Move to ' + next + '">' +
                    '<span class="cid">VEY-' + c.id + '</span><span class="ttl">' + c.t + '</span>' + (m ? '<span class="meta">' + m + '</span>' : '') + '</button>';
            }
            function render() {
                var focusId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
                root.innerHTML = COLS.map(function (col, i) {
                    var list = cards.filter(function (c) { return c.col === i });
                    return '<div class="col"><div class="ch">' + ICON[col.k] + col.name + '<span class="n">' + list.length + '</span></div>' + list.map(cardHtml).join('') + '</div>';
                }).join('');
                document.getElementById('count').textContent = cards.length + ' cards';
                if (focusId) { var f = root.querySelector('[data-id="' + focusId + '"]'); if (f) f.focus() }
                landed = null;
            }
            root.addEventListener('click', function (e) {
                var b = e.target.closest('.card'); if (!b) return;
                var c = cards.filter(function (x) { return String(x.id) === b.dataset.id })[0];
                c.col = (c.col + 1) % 3; landed = c.id; render();
            });
            render();
        })();
