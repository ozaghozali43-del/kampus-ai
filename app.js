'use strict';
/* ===== Util ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pad = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date(), TODAY = iso(NOW), MONTH = TODAY.slice(0, 7);
const fd = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const dleft = d => Math.round((new Date(d + 'T00:00') - new Date(TODAY + 'T00:00')) / 864e5);
const mname = m => new Date(m + '-01T00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], todayIdx = () => (new Date().getDay() + 6) % 7;
const LS = { get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f } catch (_) { return f } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (_) { } }, del(k) { try { localStorage.removeItem(k) } catch (_) { } } };
async function hash(p) { const t = 'kampusai:' + p; try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') } catch (_) { let h = 5381; for (const c of t) h = (h * 33) ^ c.charCodeAt(0); return 'x' + (h >>> 0).toString(16) } }
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2000) }
function inl(t) { return esc(t).replace(/^#{1,3} (.+)$/gm, '<b>$1</b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/^[-*] (.+)$/gm, '• $1').replace(/\n/g, '<br>') }
function md(s) { return String(s).split(/```(?:[\w+-]*)\n?([\s\S]*?)```/).map((p, i) => i % 2 ? `<pre class="cb"><code>${esc(p.replace(/\n$/, ''))}</code></pre>` : inl(p)).join('') }

/* ===== Ikon ===== */
const IC = {
    dashboard: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    planner: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    finance: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4z"/><rect x="3" y="7" width="18" height="14" rx="3"/><circle cx="16.5" cy="14" r="1"/>',
    docs: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="m5 12 5 5 9-10"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>'
};
const svg = k => `<svg class="i" viewBox="0 0 24 24">${IC[k]}</svg>`;
const NAV = [['dashboard', 'dashboard', 'Dashboard'], ['chat', 'chat', 'AI Chat'], ['planner', 'planner', 'Planner'], ['code', 'code', 'Coding'], ['finance', 'finance', 'Finance'], ['docs', 'docs', 'Dokumen'], ['profile', 'profile', 'Profil']];
const TITLES = { dashboard: ['Dashboard', ''], chat: ['AI Chat', 'Tanya, jelaskan, dan rangkum'], planner: ['Study Planner', 'Tugas, deadline, dan jadwal kuliah'], code: ['Coding Workspace', 'Tulis, pahami, dan perbaiki kode'], finance: ['Finance Tracker', 'Pemasukan, pengeluaran, dan anggaran bulanan'], docs: ['Document Assistant', 'Kerangka makalah, presentasi, dan ringkasan'], profile: ['Profil', 'Akun dan preferensi'] };
const CATS = { out: ['Makanan & minuman', 'Transport', 'Kos / tempat tinggal', 'Kuliah & buku', 'Internet & pulsa', 'Hiburan', 'Kesehatan', 'Lainnya'], in: ['Uang saku', 'Beasiswa', 'Pekerjaan / freelance', 'Lainnya'] };

/* ===== Akun & data (tersimpan di browser) ===== */
const ACC = 'kampusai-accounts', SES = 'kampusai-session', DK = 'kampusai-data:';
let D = null;
const S = { mode: 'login', ft: 'out', fm: MONTH, codeOut: '', docOut: '', busy: 0 };
const fresh = (name, email) => ({ u: { name, email, prodi: '', sem: '' }, tasks: [], sched: [], tx: [], budget: 0, code: '', docs: starterDocs(), msgs: [{ r: 'b', t: `Halo ${name.split(' ')[0]}! Saya **KAMPUSAI**. Tanyakan materi kuliah, minta ringkasan, atau minta bantuan soal tugas dan keuanganmu.` }] });
function loadUser(email) { const a = LS.get(ACC, {})[email]; if (!a) return null; return Object.assign(fresh(a.name, email), LS.get(DK + email, {})) }
function save() { if (D) { D.msgs = D.msgs.slice(-60); LS.set(DK + D.u.email, D) } }

/* ===== Tema & latar ===== */
const isDark = () => document.documentElement.dataset.theme !== 'light';
function setTheme(t) { document.documentElement.dataset.theme = t; LS.set('kampusai-theme', t) }
setTheme(LS.get('kampusai-theme', null) || (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark'));
function setBg(url) { document.body.style.background = url ? `linear-gradient(var(--ov),var(--ov)),url("${url}") center/cover no-repeat` : ''; document.body.style.backgroundAttachment = url ? 'fixed' : '' }
{ const b = LS.get('kampusai-bg', null); if (b) setBg(b) }

/* ===== Data turunan ===== */
const sums = m => { const t = D.tx.filter(x => x.d.slice(0, 7) == m), i = t.filter(x => x.k == 'in').reduce((a, x) => a + x.a, 0), o = t.filter(x => x.k == 'out').reduce((a, x) => a + x.a, 0); return { i, o, b: i - o } };
const pending = () => D.tasks.filter(t => !t.x).sort((a, b) => a.d.localeCompare(b.d));
const todayClasses = () => D.sched.filter(c => c.day == todayIdx()).sort((a, b) => a.time.localeCompare(b.time));
const greet = () => { const h = new Date().getHours(); return h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam' };
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';

/* ===== Asisten chat (mode dasar, tanpa server) ===== */
const KB = { 'machine learning': '**Machine learning** adalah cabang AI di mana komputer belajar pola dari data tanpa diprogram aturan satu per satu. Tiga jenis utamanya: *supervised*, *unsupervised*, dan *reinforcement learning*.', 'basis data': '**Basis data** adalah kumpulan data terstruktur yang dikelola DBMS. Konsep kunci: tabel, primary key, foreign key, relasi, dan normalisasi (1NF sampai 3NF) untuk mengurangi redundansi.', 'rekursi': '**Rekursi** adalah fungsi yang memanggil dirinya sendiri. Syaratnya: ada *base case* untuk berhenti dan *recursive case* yang mengecilkan masalah. Contoh faktorial: `n * fakt(n-1)`.', 'normalisasi': '**Normalisasi** merapikan tabel agar tidak ada data ganda. 1NF: nilai atomik. 2NF: tidak ada ketergantungan parsial. 3NF: tidak ada ketergantungan transitif.' };
function bot(q) {
    const l = q.toLowerCase(); for (const k in KB) if (l.includes(k)) return KB[k] + '\n\nMau saya buatkan contoh soal atau ringkasan poin-poinnya?';
    if (/rangkum|ringkas/.test(l)) return 'Buka menu **Dokumen**, tempel teksmu, lalu pilih “Ringkas teks”.';
    if (/python|kode|coding|program/.test(l)) return 'Buka **Coding Workspace**, tempel kodenya, lalu klik “Perbaiki” atau “Jelaskan”.';
    if (/tugas|deadline|jadwal/.test(l)) { const p = pending(); return p.length ? `Kamu punya **${p.length} tugas aktif**. Terdekat: **${p[0].t}** (${fd(p[0].d)}, ${dleft(p[0].d)} hari lagi).` : 'Belum ada tugas aktif. Tambahkan di menu **Planner** agar saya bisa membantu mengatur prioritas.' }
    if (/uang|hemat|budget|keuangan|boros|anggaran/.test(l)) { if (!D.tx.length) return 'Belum ada transaksi tercatat. Mulai catat di menu **Finance**, lalu saya bisa bantu menganalisis pengeluaranmu.'; const s = sums(MONTH); return `Bulan ini pemasukan **${rp(s.i)}**, pengeluaran **${rp(s.o)}**, selisih **${rp(s.b)}**.` }
    if (/^(halo|hai|hi)\b/.test(l)) return `Halo ${D.u.name.split(' ')[0]}! Ada yang bisa dibantu?`;
    return 'Saya belum punya jawaban untuk itu di mode dasar. Coba tanyakan tentang *machine learning*, *basis data*, *rekursi*, *tugas*, atau *keuangan*.'
}
const API = location.port === '5500' ? 'http://localhost:3000/api/chat' : '/api/chat';
function ctx() { const s = sums(MONTH), p = pending().map(t => `${t.t} (${t.c || '-'}, deadline ${t.d}, prioritas ${t.p})`).join('; ') || 'belum ada'; return `Nama: ${D.u.name}; prodi: ${D.u.prodi || '-'}, semester ${D.u.sem || '-'}. Tanggal hari ini: ${TODAY}. Tugas aktif: ${p}. Keuangan bulan ini: pemasukan ${rp(s.i)}, pengeluaran ${rp(s.o)}, anggaran ${D.budget ? rp(D.budget) : 'belum diatur'}.` }
async function send(q) {
    q = (q || '').trim(); if (!q || S.busy) return; S.busy = 1; D.msgs.push({ r: 'u', t: q }); route();
    const m = $('#msgs'); if (m) { m.insertAdjacentHTML('beforeend', '<div class="m b">Berpikir…</div>'); m.scrollTop = m.scrollHeight }
    try {
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: D.msgs.slice(-20).map(x => ({ role: x.r == 'u' ? 'user' : 'assistant', content: x.t })), context: ctx() }) });
        const j = await r.json(); if (!r.ok || !j.reply) throw new Error(j.error || 'gagal'); D.msgs.push({ r: 'b', t: j.reply })
    }
    catch (e) { D.msgs.push({ r: 'b', t: bot(q) + '\n\n(Mode dasar. Jalankan `node server.js` dengan API key untuk jawaban lengkap.)' }) }
    S.busy = 0; if (D && location.hash == '#chat') route()
}

/* ===== Asisten kode (heuristik) ===== */
function fixCode(c) { return c.split('\n').map(l => { let m = l.replace(/^(\s*)print\s+(?!\()(.+)$/, '$1print($2)'); if (/^\s*(def|if|elif|else|for|while|class|try|except)\b.*[^:\s]\s*$/.test(m) && !/[:,(\[{]$/.test(m.trim())) m = m.replace(/\s*$/, ':'); return m }).join('\n') }
function explain(c) { const o = []; c.split('\n').forEach((l, i) => { const t = l.trim(); if (!t) return; let e = 'Menjalankan perintah ini.'; if (/^def /.test(t)) e = 'Mendefinisikan fungsi `' + t.slice(4).split('(')[0] + '`.'; else if (/^for /.test(t)) e = 'Perulangan untuk setiap elemen.'; else if (/^while /.test(t)) e = 'Perulangan selama kondisi benar.'; else if (/^if |^elif |^else/.test(t)) e = 'Percabangan kondisi.'; else if (/print/.test(t)) e = 'Mencetak keluaran ke layar.'; else if (/^return/.test(t)) e = 'Mengembalikan nilai dari fungsi.'; else if (/^\w+\s*=/.test(t)) e = 'Menyimpan nilai ke variabel `' + t.split('=')[0].trim() + '`.'; o.push(`Baris ${i + 1}: ${t}\n   → ${e}`) }); return o.join('\n') }
function runCode(c) { const o = []; c.split('\n').forEach(l => { const m = l.match(/^\s*print\(\s*(["'])(.*?)\1\s*\)/); if (m) o.push(m[2]) }); return o.length ? o.join('\n') + '\n\n(Hanya menjalankan print teks literal.)' : 'Tidak ada keluaran. Editor ini hanya menjalankan print("teks").' }
const SAMPLE = 'def hitung_rata(data)\n    total = 0\n    for x in data:\n        total += x\n    print "Rata-rata:", total/len(data)\n\nnilai = [80, 75, 90, 85]\nhitung_rata(nilai)';

/* ===== Dokumen ===== */
function sumText(t) { const s = t.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [t], k = s.slice(0, Math.min(3, s.length)).map(x => '• ' + x.trim()); return `RINGKASAN (${t.split(/\s+/).filter(Boolean).length} kata → ${k.join(' ').split(/\s+/).length} kata)\n\n${k.join('\n')}\n\nKata kunci: ${[...new Set(t.toLowerCase().match(/\b[a-z]{7,}\b/g) || [])].slice(0, 6).join(', ') || '-'}` }
const outline = t => `MAKALAH: ${t.toUpperCase()}\n\nBAB I PENDAHULUAN\n 1.1 Latar Belakang\n 1.2 Rumusan Masalah\n 1.3 Tujuan\nBAB II PEMBAHASAN\n 2.1 Konsep dasar ${t}\n 2.2 Permasalahan dan tantangan\n 2.3 Solusi dan penerapan\nBAB III PENUTUP\n 3.1 Kesimpulan\n 3.2 Saran\nDAFTAR PUSTAKA`;
const slides = t => `PRESENTASI: ${t}\n\nSlide 1 – Judul & identitas\nSlide 2 – Latar belakang\nSlide 3 – Rumusan masalah & tujuan\nSlide 4 – Konsep utama ${t}\nSlide 5 – Studi kasus / contoh\nSlide 6 – Analisis & solusi\nSlide 7 – Kesimpulan\nSlide 8 – Tanya jawab`;
const DEF_TOPIC = 'Dampak teknologi terhadap pendidikan tinggi', DEF_TEXT = 'Kecerdasan buatan mengubah cara mahasiswa belajar. Platform adaptif dapat menyesuaikan materi dengan kecepatan setiap individu. Namun, penggunaannya perlu etika agar tidak menggantikan proses berpikir kritis. Kampus perlu menyusun panduan yang jelas tentang penggunaan teknologi dalam pembelajaran.';
const TPL = {
    mk: ['Kerangka makalah', 'Makalah', t => outline(t)],
    lap: ['Laporan praktikum', 'Laporan', t => `LAPORAN PRAKTIKUM: ${t.toUpperCase()}\n\n1. Tujuan Praktikum\n2. Dasar Teori\n3. Alat dan Bahan\n4. Langkah Kerja\n5. Hasil dan Pengamatan\n6. Pembahasan\n7. Kesimpulan\n8. Daftar Pustaka\nLampiran`],
    prop: ['Proposal', 'Proposal', t => `PROPOSAL: ${t.toUpperCase()}\n\n1. Latar Belakang\n2. Rumusan Masalah\n3. Tujuan dan Manfaat\n4. Tinjauan Pustaka\n5. Metode Pelaksanaan\n6. Jadwal Kegiatan\n7. Rencana Anggaran Biaya\n8. Daftar Pustaka`],
    esai: ['Esai', 'Esai', t => `ESAI: ${t.toUpperCase()}\n\nPembuka\n - Pertanyaan pemantik\n - Tesis utama tentang ${t}\nIsi\n - Argumen 1 + bukti\n - Argumen 2 + bukti\n - Argumen 3 + sanggahan\nPenutup\n - Rangkuman argumen\n - Penegasan tesis dan implikasi`],
    ppt: ['Presentasi', 'Presentasi', t => slides(t)]
};
const starterDocs = () => [{ id: 1, title: 'Contoh – Kerangka makalah', type: 'Makalah', body: outline(DEF_TOPIC), date: TODAY }, { id: 2, title: 'Contoh – Kerangka presentasi', type: 'Presentasi', body: slides('Manajemen waktu mahasiswa'), date: TODAY }, { id: 3, title: 'Contoh – Ringkasan teks', type: 'Ringkasan', body: sumText(DEF_TEXT), date: TODAY }];
function analyze(t) {
    const w = t.toLowerCase().match(/[a-zà-ÿ0-9']+/g) || [], sent = (t.match(/[^.!?]+[.!?]+/g) || [t]).length, para = t.split(/\n\s*\n/).filter(x => x.trim()).length || 1, stop = new Set('yang dan di ke dari untuk pada dengan ini itu atau dalam akan juga agar tidak ada adalah oleh sebagai dapat karena namun bagi para serta telah sudah lebih harus perlu the of and to in is'.split(' ')), f = {};
    w.filter(x => x.length > 3 && !stop.has(x)).forEach(x => f[x] = (f[x] || 0) + 1); const top = Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} (${v})`).join(', ') || '-';
    return `ANALISIS TEKS\n\nJumlah kata        : ${w.length}\nJumlah kalimat     : ${sent}\nJumlah paragraf    : ${para}\nRata-rata kata/kal.: ${(w.length / sent).toFixed(1)}\nEstimasi waktu baca: ${Math.max(1, Math.round(w.length / 200))} menit\n\nKata paling sering : ${top}`
}
const keepDoc = () => { const a = $('#dt'), b = $('#ds'); if (a) S.dtv = a.value; if (b) S.dsv = b.value };

/* ===== Halaman ===== */
function calendar() {
    const y = NOW.getFullYear(), m = NOW.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), dls = new Set(D.tasks.filter(t => !t.x && t.d.slice(0, 7) == MONTH).map(t => +t.d.slice(8)));
    let h = ['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(x => `<b>${x}</b>`).join('') + '<i></i>'.repeat(off); for (let i = 1; i <= n; i++)h += `<div class="${i == NOW.getDate() ? 'td' : ''} ${dls.has(i) ? 'dl' : ''}">${i}</div>`; return `<div class="cal">${h}</div>`
}
const taskRow = t => `<div class="rw ${t.x ? 'done' : ''}"><input type="checkbox" data-a="ck" data-id="${t.id}" ${t.x ? 'checked' : ''}><div class="f"><b>${esc(t.t)}</b><small>${esc(t.c || 'Tanpa mata kuliah')} · ${fd(t.d)}${!t.x ? (dleft(t.d) < 0 ? ' · terlambat' : dleft(t.d) <= 3 ? ' · sisa ' + dleft(t.d) + ' hari' : '') : ''}</small></div><span class="tag ${t.p}">${t.p}</span><button class="x" data-a="del" data-id="${t.id}" aria-label="Hapus">${svg('x')}</button></div>`;

const P = {
    dashboard() {
        const pend = pending(), s = sums(MONTH), cls = todayClasses();
        const steps = [[D.budget > 0, 'Atur anggaran bulanan', 'finance'], [D.tx.length > 0, 'Catat transaksi pertama', 'finance'], [D.tasks.length > 0, 'Tambahkan tugas atau deadline', 'planner'], [D.sched.length > 0, 'Isi jadwal kuliah', 'planner'], [D.msgs.some(m => m.r == 'u'), 'Ajukan pertanyaan di AI Chat', 'chat']];
        const left = steps.filter(x => !x[0]).length;
        return `<div class="strip"><div class="st"><span>Tugas aktif</span><b class="num">${pend.length}</b></div><div class="st"><span>Deadline terdekat</span><b>${pend[0] ? (dleft(pend[0].d) < 0 ? 'Terlambat' : dleft(pend[0].d) == 0 ? 'Hari ini' : dleft(pend[0].d) + ' hari') : '–'}</b></div><div class="st"><span>Selisih bulan ini</span><b class="num">${rp(s.b)}</b></div><div class="st"><span>Kuliah hari ini</span><b class="num">${cls.length}</b></div></div>
${left ? `<div class="blk"><div class="bh"><h3>Langkah awal</h3><span class="mut sm">${5 - left} dari 5 selesai</span></div>${steps.map(x => `<div class="rw step ${x[0] ? 'ok' : ''}"><span class="dot">${x[0] ? svg('check') : ''}</span><div class="f"><b>${x[1]}</b></div>${x[0] ? '' : `<button class="lnk" data-r="${x[2]}">Mulai</button>`}</div>`).join('')}</div>` : ''}
<div class="cols top1"><section class="blk"><div class="bh"><h3>Deadline mendatang</h3><button class="lnk" data-r="planner">Kelola</button></div>${pend.length ? pend.slice(0, 4).map(t => `<div class="rw"><div class="f"><b>${esc(t.t)}</b><small>${esc(t.c || 'Tanpa mata kuliah')} · ${fd(t.d)}</small></div><span class="tag ${t.p}">${t.p}</span></div>`).join('') : '<div class="empty">Belum ada tugas aktif.</div>'}</section>
<section class="blk"><div class="bh"><h3>Keuangan bulan ini</h3><button class="lnk" data-r="finance">Kelola</button></div>${D.tx.length || D.budget ? `<div class="rw"><div class="f">Pemasukan</div><span class="pos num">${rp(s.i)}</span></div><div class="rw"><div class="f">Pengeluaran</div><span class="neg num">${rp(s.o)}</span></div>${D.budget ? `<div class="bar ${s.o > D.budget ? 'over' : ''}"><i style="width:${Math.min(100, s.o / D.budget * 100)}%"></i></div><small class="mut">${rp(s.o)} dari anggaran ${rp(D.budget)}</small>` : '<div class="empty">Anggaran belum diatur.</div>'}` : '<div class="empty">Belum ada data keuangan.</div>'}</section></div>
<div class="blk" style="border-top:1px solid var(--line)"><div class="bh"><h3>Jadwal kuliah hari ini</h3><button class="lnk" data-r="planner">Kelola</button></div>${cls.length ? cls.map(c => `<div class="rw"><b class="num" style="width:60px">${c.time}</b><div class="f">${esc(c.name)}${c.room ? `<small>${esc(c.room)}</small>` : ''}</div></div>`).join('') : '<div class="empty">Tidak ada jadwal kuliah hari ini.</div>'}</div>`
    },

    chat() {
        return `<div class="chat"><div class="msgs" id="msgs">${D.msgs.map(m => `<div class="m ${m.r}">${md(m.t)}</div>`).join('')}</div>
<div class="chips">${['Jelaskan machine learning', 'Apa itu rekursi?', 'Tugas apa yang harus kukerjakan dulu?', 'Bagaimana kondisi keuanganku?'].map(q => `<button data-a="ask" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
<div class="row"><input id="ci" placeholder="Ketik pertanyaanmu…" autocomplete="off"><button class="btn" data-a="chatSend">Kirim</button></div></div>`},

    planner() {
        const sorted = [...D.tasks].sort((a, b) => a.x - b.x || a.d.localeCompare(b.d)), act = D.tasks.filter(t => !t.x).length;
        const byDay = DAYS.map((n, i) => [n, D.sched.filter(c => c.day == i).sort((a, b) => a.time.localeCompare(b.time))]).filter(x => x[1].length);
        return `<div class="cols top1"><section class="blk"><div class="bh"><h3>Tugas & deadline</h3><span class="mut sm">${act} aktif · ${D.tasks.length - act} selesai</span></div>
<input id="tt" placeholder="Judul tugas"><div class="fr"><input id="tc" placeholder="Mata kuliah"><input id="td" type="date" value="${TODAY}"></div><div class="fr"><select id="tp"><option>Tinggi</option><option selected>Sedang</option><option>Rendah</option></select><button class="btn" data-a="addTask">Tambah tugas</button></div>
<div style="margin-top:14px">${sorted.length ? sorted.map(taskRow).join('') : '<div class="empty">Belum ada tugas. Tambahkan tugas pertamamu di atas.</div>'}</div></section>
<section class="blk"><div class="bh"><h3>${mname(MONTH)}</h3><span class="mut sm">Titik kuning = deadline</span></div>${calendar()}
<h3 style="margin:24px 0 4px">Jadwal kuliah</h3><div class="fr"><select id="sd">${DAYS.map((d, i) => `<option value="${i}" ${i == todayIdx() ? 'selected' : ''}>${d}</option>`).join('')}</select><input id="sm" type="time" value="08:00"></div><div class="fr"><input id="sn" placeholder="Mata kuliah"><input id="sr" placeholder="Ruang (opsional)"><button class="btn" data-a="addClass">Tambah</button></div>
${byDay.length ? byDay.map(([n, l]) => `<div class="dayh">${n}</div>${l.map(c => `<div class="rw"><b class="num" style="width:60px">${c.time}</b><div class="f">${esc(c.name)}${c.room ? `<small>${esc(c.room)}</small>` : ''}</div><button class="x" data-a="delClass" data-id="${c.id}" aria-label="Hapus">${svg('x')}</button></div>`).join('')}`).join('') : '<div class="empty">Belum ada jadwal kuliah.</div>'}</section></div>`
    },

    code() {
        return `<div class="cols top1"><section class="blk"><div class="bh"><h3>Editor</h3><select id="cl" style="width:auto"><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option></select></div>
<textarea id="ce" class="code" spellcheck="false" placeholder="Tulis atau tempel kode di sini…">${esc(D.code)}</textarea>
<div class="fr"><button class="btn" data-a="code" data-c="fix">Perbaiki</button><button class="btn g" data-a="code" data-c="exp">Jelaskan</button><button class="btn g" data-a="code" data-c="run">Jalankan</button><button class="btn g" data-a="code" data-c="copy">Salin</button><button class="btn g" data-a="code" data-c="sample">Muat contoh</button></div></section>
<section class="blk"><div class="bh"><h3>Hasil asisten</h3></div><div class="out" id="co">${esc(S.codeOut) || 'Hasil perbaikan, penjelasan, atau keluaran akan tampil di sini.'}</div><p class="mut sm" style="margin-top:8px">Perbaikan otomatis saat ini mendukung sintaks Python dasar.</p></section></div>`
    },

    finance() {
        const s = sums(S.fm), bud = D.budget, pc = bud ? Math.min(100, s.o / bud * 100) : 0, over = bud && s.o > bud;
        const months = [...new Set([MONTH, S.fm, ...D.tx.map(t => t.d.slice(0, 7))])].sort().reverse();
        const list = D.tx.filter(t => t.d.slice(0, 7) == S.fm).sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id), cats = {};
        list.filter(t => t.k == 'out').forEach(t => cats[t.c] = (cats[t.c] || 0) + t.a);
        return `<div class="blk" style="padding-bottom:16px;border-top:1px solid var(--line)"><div class="row sp" style="flex-wrap:wrap"><div class="row"><span class="mut sm">Periode</span><select id="fm" data-ch="fm" style="width:auto">${months.map(m => `<option value="${m}" ${m == S.fm ? 'selected' : ''}>${mname(m)}</option>`).join('')}</select></div><span class="mut sm">Semua angka dimulai dari Rp 0</span></div></div>
<div class="strip"><div class="st"><span>Pemasukan</span><b class="pos num">${rp(s.i)}</b></div><div class="st"><span>Pengeluaran</span><b class="neg num">${rp(s.o)}</b></div><div class="st"><span>Selisih</span><b class="num">${rp(s.b)}</b></div><div class="st"><span>Anggaran bulanan</span><b class="num">${bud ? rp(bud) : 'Belum diatur'}</b></div></div>
<div class="blk"><div class="bh"><h3>Anggaran bulanan</h3>${bud ? `<span class="${over ? 'neg' : 'mut'} sm">${over ? 'Melebihi anggaran ' + rp(s.o - bud) : 'Sisa ' + rp(bud - s.o)}</span>` : ''}</div>
${bud ? `<div class="bar ${over ? 'over' : ''}"><i style="width:${pc}%"></i></div><p class="mut sm">${pc.toFixed(0)}% terpakai</p>` : '<p class="mut sm" style="margin-bottom:4px">Tentukan batas pengeluaran per bulan untuk memantau keuanganmu.</p>'}
<div class="fr"><input id="fb" type="number" min="0" placeholder="Anggaran bulanan (Rp)" value="${bud || ''}"><button class="btn" data-a="setBudget">${bud ? 'Perbarui' : 'Simpan anggaran'}</button></div></div>
<div class="cols top1"><section class="blk"><div class="bh"><h3>Catat transaksi</h3></div><div class="seg"><button class="${S.ft == 'out' ? 'on' : ''}" data-a="ft" data-v="out">Pengeluaran</button><button class="${S.ft == 'in' ? 'on' : ''}" data-a="ft" data-v="in">Pemasukan</button></div>
<div class="fr"><input id="fa" type="number" min="0" placeholder="Nominal (Rp)"><input id="fdt" type="date" value="${TODAY}"></div><div class="fr"><select id="fc">${CATS[S.ft].map(c => `<option>${c}</option>`).join('')}</select><input id="ft" placeholder="Keterangan (opsional)"></div><div class="fr"><button class="btn" data-a="addTx">Simpan transaksi</button></div>
<h3 style="margin:24px 0 4px">Riwayat ${mname(S.fm)}</h3>${list.length ? list.map(t => `<div class="rw"><div class="f"><b>${esc(t.t || t.c)}</b><small>${esc(t.c)} · ${fd(t.d)}</small></div><span class="${t.k == 'in' ? 'pos' : 'neg'} num">${t.k == 'in' ? '+' : '−'}${rp(t.a)}</span><button class="x" data-a="delTx" data-id="${t.id}" aria-label="Hapus">${svg('x')}</button></div>`).join('') : `<div class="empty">Belum ada transaksi pada ${mname(S.fm)}.</div>`}</section>
<section class="blk"><div class="bh"><h3>Pengeluaran per kategori</h3></div>${Object.keys(cats).length ? Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div style="margin-bottom:14px"><div class="row sp sm"><span>${esc(k)}</span><b class="num">${rp(v)} · ${(v / s.o * 100).toFixed(0)}%</b></div><div class="bar"><i style="width:${v / s.o * 100}%"></i></div></div>`).join('') : '<div class="empty">Rincian muncul setelah kamu mencatat pengeluaran.</div>'}</section></div>`
    },

    docs() {
        const out = S.docOut || outline(DEF_TOPIC), title = S.docTitle || ('Kerangka makalah – ' + DEF_TOPIC);
        return `<div class="blk" style="border-top:1px solid var(--line)"><div class="bh"><h3>Template cepat</h3><span class="mut sm">Isi topik, lalu pilih jenis dokumen</span></div><input id="dt" value="${esc(S.dtv ?? DEF_TOPIC)}" placeholder="Topik dokumen"><div class="chips" style="margin-bottom:0">${Object.entries(TPL).map(([k, v]) => `<button data-a="doc" data-d="${k}">${v[0]}</button>`).join('')}</div></div>
<div class="cols top1"><section class="blk"><div class="bh"><h3>Ringkas & analisis teks</h3></div><label for="ds" style="margin-top:0">Tempel teks, atau unggah file .txt / .md</label><textarea id="ds" rows="8" placeholder="Tempel teks di sini…">${esc(S.dsv ?? DEF_TEXT)}</textarea><div class="fr"><input type="file" id="df" accept=".txt,.md,text/plain"></div><p class="mut sm" style="margin-top:6px">Untuk PDF, salin teksnya lalu tempel di atas.</p><div class="fr"><button class="btn" data-a="doc" data-d="sum">Ringkas teks</button><button class="btn g" data-a="doc" data-d="ana">Analisis teks</button></div></section>
<section class="blk"><div class="bh"><h3>Hasil</h3><span class="row"><button class="lnk" data-a="doc" data-d="copy">Salin</button><button class="lnk" data-a="dl">Unduh</button><button class="lnk" data-a="saveDoc">Simpan</button></span></div><div class="dtitle" id="dtitle">${esc(title)}</div><div class="out" id="do">${esc(out)}</div></section></div>
<div class="blk"><div class="bh"><h3>Dokumen tersimpan</h3><span class="mut sm">${D.docs.length} dokumen</span></div>${D.docs.length ? D.docs.map(d => `<div class="rw tap" data-a="openDoc" data-id="${d.id}"><div class="f"><b>${esc(d.title)}</b><small>${esc(d.type)} · ${fd(d.date)}</small></div><span class="lnk">Buka</span><button class="x" data-a="delDoc" data-id="${d.id}" aria-label="Hapus">${svg('x')}</button></div>`).join('') : '<div class="empty">Dokumen yang kamu simpan akan muncul di sini.</div>'}</div>`
    },

    profile() {
        const dk = isDark();
        return `<div class="cols top1"><section class="blk"><div class="row" style="margin-bottom:6px"><span class="av" style="width:52px;height:52px;font-size:18px">${esc(initials(D.u.name))}</span><div><h3>${esc(D.u.name)}</h3><span class="mut sm">${esc(D.u.email)}</span></div></div>
<label for="pn">Nama lengkap</label><input id="pn" value="${esc(D.u.name)}"><label for="pp">Program studi</label><input id="pp" value="${esc(D.u.prodi)}" placeholder="Contoh: Teknik Informatika"><label for="ps">Semester</label><input id="ps" type="number" min="1" max="14" value="${esc(D.u.sem)}"><div class="fr"><button class="btn" data-a="saveProfile">Simpan perubahan</button></div></section>
<section class="blk"><h3 style="margin-bottom:6px">Tampilan</h3><div class="rw"><div class="f"><b>Mode gelap</b><small>Nyaman untuk belajar malam</small></div><button class="sw ${dk ? 'on' : ''}" data-a="theme" aria-label="Mode gelap"></button></div>
<label for="bgf">Latar belakang dari galeri</label><input type="file" id="bgf" accept="image/*"><div class="fr"><button class="btn g s" data-a="clearBg">Reset latar</button></div>
<h3 style="margin:28px 0 6px">Data akun</h3><p class="mut sm">Hapus semua tugas, jadwal, transaksi, dan riwayat chat untuk memulai dari nol.</p><div class="fr"><button class="btn g s" data-a="resetData">Hapus semua data</button></div>
<div class="fr" style="margin-top:20px"><button class="btn g s" data-a="logout">Keluar dari akun</button></div></section></div>`}
};

/* ===== Router ===== */
const show = v => ['landing', 'auth', 'app'].forEach(x => $('#v-' + x).classList.toggle('hide', x != v));
function setMode(m) { S.mode = m; const r = m == 'register'; $('#t-login').classList.toggle('on', !r); $('#t-register').classList.toggle('on', r); $('#f-name').classList.toggle('hide', !r); $('#a-title').textContent = r ? 'Buat akun baru' : 'Selamat datang kembali'; $('#a-sub').textContent = r ? 'Daftar untuk mulai mengatur kuliahmu.' : 'Masuk untuk melanjutkan.'; $('#a-go').textContent = r ? 'Buat akun' : 'Masuk'; $('#a-pass').autocomplete = r ? 'new-password' : 'current-password'; $('#a-err').textContent = '' }
const nav = h => { if (location.hash === '#' + h) route(); else location.hash = h };
function route() {
    let h = location.hash.slice(1) || 'landing';
    $('#navbtns').innerHTML = D ? '<button class="btn s" data-r="dashboard">Buka aplikasi</button>' : '<button class="btn g s" data-a="auth" data-mode="login">Masuk</button><button class="btn s" data-a="auth" data-mode="register">Daftar</button>';
    if (h == 'landing') { show('landing'); return }
    if (!D || h == 'auth') { if (D) { nav('dashboard'); return } show('auth'); setMode(S.mode); if (h != 'auth') history.replaceState(null, '', '#auth'); return }
    if (!P[h]) h = 'dashboard'; save(); show('app');
    const first = D.u.name.split(' ')[0];
    const sd = $('#side'); if (!sd.dataset.b) { sd.dataset.b = 1; sd.innerHTML = '<span class="pill" id="pill"></span><div class="logo"><i>' + svg('cap') + '</i>KAMPUSAI</div>' + NAV.map(n => `<a data-r="${n[0]}">${svg(n[1])}<span>${n[2]}</span></a>`).join('') }
    sd.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.r == h));
    $('#ptitle').textContent = h == 'dashboard' ? `Selamat ${greet()}, ${first}` : TITLES[h][0];
    $('#psub').textContent = h == 'dashboard' ? NOW.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : TITLES[h][1];
    $('#acct').innerHTML = `<button class="acc" data-a="menu" aria-haspopup="true"><span class="av">${esc(initials(D.u.name))}</span><span class="an">${esc(first)}</span>${svg('chev')}</button><div class="dd hide" id="dd"><div class="dh"><b>${esc(D.u.name)}</b><span>${esc(D.u.email)}</span></div><a data-r="profile">${svg('profile')}Profil saya</a><a data-a="theme">${svg('moon')}Ganti tema</a><a class="red" data-a="logout">${svg('out')}Keluar</a></div>`;
    $('#page').innerHTML = P[h](); const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
    if (S.lastPage !== h) { const pe = $('#page'); pe.classList.remove('in'); void pe.offsetWidth; pe.classList.add('in'); S.lastPage = h; scrollTo(0, 0) }
    placePill(!S.pillInit); S.pillInit = 1
}
function placePill(instant) { const a = document.querySelector('#side a.on'), p = $('#pill'); if (!a || !p) return; if (instant) p.style.transition = 'none'; p.style.width = a.offsetWidth + 'px'; p.style.height = a.offsetHeight + 'px'; p.style.setProperty('--px', a.offsetLeft + 'px'); p.style.setProperty('--py', a.offsetTop + 'px'); if (instant) { void p.offsetWidth; p.style.transition = '' } }
addEventListener('resize', () => placePill(true));
addEventListener('hashchange', route);

/* ===== Aksi ===== */
const A = {
    auth(el) { S.mode = el.dataset.mode || 'login'; nav('auth') },
    mode(el) { setMode(el.dataset.mode) },
    async submit() {
        const name = $('#a-name').value.trim(), email = $('#a-email').value.trim().toLowerCase(), pw = $('#a-pass').value, err = m => { $('#a-err').textContent = m }, acc = LS.get(ACC, {});
        if (!/^\S+@\S+\.\S+$/.test(email)) return err('Masukkan alamat email yang valid.');
        if (S.mode == 'register') {
            if (name.length < 2) return err('Masukkan nama lengkap.'); if (pw.length < 6) return err('Kata sandi minimal 6 karakter.'); if (acc[email]) return err('Email ini sudah terdaftar. Silakan masuk.');
            acc[email] = { name, hash: await hash(pw) }; LS.set(ACC, acc); D = fresh(name, email)
        }
        else { if (!pw) return err('Masukkan kata sandi.'); const a = acc[email]; if (!a || a.hash !== await hash(pw)) return err('Email atau kata sandi salah.'); D = loadUser(email) }
        LS.set(SES, email); save(); $('#a-pass').value = ''; nav('dashboard')
    },
    logout() { save(); LS.del(SES); D = null; nav('landing') },
    menu() { $('#dd').classList.toggle('hide') },
    theme() { setTheme(isDark() ? 'light' : 'dark'); if (D && location.hash == '#profile') route() },
    ck(el) { const t = D.tasks.find(x => x.id == el.dataset.id); if (t) { t.x = !t.x; route() } },
    del(el) { D.tasks = D.tasks.filter(x => x.id != el.dataset.id); route() },
    addTask() { const v = $('#tt').value.trim(); if (!v) return toast('Isi judul tugas terlebih dahulu'); D.tasks.push({ id: Date.now(), t: v, d: $('#td').value || TODAY, c: $('#tc').value.trim(), p: $('#tp').value, x: false }); route(); toast('Tugas ditambahkan') },
    addClass() { const n = $('#sn').value.trim(); if (!n) return toast('Isi nama mata kuliah'); D.sched.push({ id: Date.now(), day: +$('#sd').value, time: $('#sm').value || '08:00', name: n, room: $('#sr').value.trim() }); route(); toast('Jadwal ditambahkan') },
    delClass(el) { D.sched = D.sched.filter(x => x.id != el.dataset.id); route() },
    ft(el) { S.ft = el.dataset.v; document.querySelectorAll('.seg button[data-a="ft"]').forEach(b => b.classList.toggle('on', b.dataset.v == S.ft)); $('#fc').innerHTML = CATS[S.ft].map(c => `<option>${c}</option>`).join('') },
    addTx() { const a = Math.round(+$('#fa').value); if (!a || a <= 0) return toast('Isi nominal lebih dari 0'); const d = $('#fdt').value || TODAY; D.tx.push({ id: Date.now(), t: $('#ft').value.trim(), a, k: S.ft, c: $('#fc').value, d }); S.fm = d.slice(0, 7); route(); toast('Transaksi disimpan') },
    delTx(el) { D.tx = D.tx.filter(x => x.id != el.dataset.id); route() },
    setBudget() { const v = Math.round(+$('#fb').value); if (isNaN(v) || v < 0) return toast('Masukkan nominal anggaran yang valid'); D.budget = v; route(); toast(v ? 'Anggaran disimpan' : 'Anggaran dihapus') },
    ask(el) { send(el.dataset.q) },
    chatSend() { const i = $('#ci'); send(i.value) },
    code(el) {
        const ed = $('#ce'), c = el.dataset.c;
        if (c == 'sample') { D.code = SAMPLE; ed.value = SAMPLE; S.codeOut = 'Contoh dimuat. Klik “Perbaiki” untuk memperbaiki kesalahan sintaksnya.' }
        else {
            D.code = ed.value; if (!D.code.trim()) return toast('Tulis atau tempel kode terlebih dahulu');
            if (c == 'copy') { navigator.clipboard && navigator.clipboard.writeText(D.code).then(() => toast('Kode disalin'), () => toast('Gagal menyalin')); return }
            if (c == 'fix') { const f = fixCode(D.code); S.codeOut = f == D.code ? 'Tidak ada kesalahan sintaks yang terdeteksi.' : 'Kode telah diperbaiki:\n\n' + f + '\n\nPerbaikan: tanda “:” pada definisi/blok dan print() dengan kurung.'; if (f != D.code) { D.code = f; ed.value = f } }
            if (c == 'exp') S.codeOut = explain(D.code); if (c == 'run') S.codeOut = runCode(D.code)
        }
        $('#co').textContent = S.codeOut; save()
    },
    doc(el) {
        const d = el.dataset.d, o = $('#do'), ti = $('#dtitle'), cur = () => S.docOut || outline(DEF_TOPIC);
        if (d == 'copy') { navigator.clipboard && navigator.clipboard.writeText(cur()).then(() => toast('Hasil disalin'), () => toast('Gagal menyalin')); return }
        if (d == 'sum' || d == 'ana') { const t = $('#ds').value.trim(); if (!t) return toast('Tempel teks terlebih dahulu'); S.docOut = d == 'sum' ? sumText(t) : analyze(t); S.docTitle = (d == 'sum' ? 'Ringkasan' : 'Analisis') + ' teks'; S.docType = d == 'sum' ? 'Ringkasan' : 'Analisis' }
        else { const t = $('#dt').value.trim(); if (!t) return toast('Isi topik terlebih dahulu'); S.docOut = TPL[d][2](t); S.docTitle = TPL[d][0] + ' – ' + t; S.docType = TPL[d][1] }
        o.textContent = S.docOut; ti.textContent = S.docTitle; o.style.animation = 'none'; void o.offsetWidth; o.style.animation = 'pgin .45s cubic-bezier(.2,.8,.2,1)'
    },
    dl() { const t = S.docOut || outline(DEF_TOPIC), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = ((S.docTitle || 'dokumen').replace(/[^\w\- ]+/g, '').trim() || 'dokumen') + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500) },
    saveDoc() { keepDoc(); D.docs.unshift({ id: Date.now(), title: S.docTitle || ('Kerangka makalah – ' + DEF_TOPIC), type: S.docType || 'Makalah', body: S.docOut || outline(DEF_TOPIC), date: TODAY }); route(); toast('Dokumen disimpan') },
    openDoc(el) { const d = D.docs.find(x => x.id == el.dataset.id); if (!d) return; keepDoc(); S.docOut = d.body; S.docTitle = d.title; S.docType = d.type; route(); scrollTo({ top: 0, behavior: 'smooth' }) },
    delDoc(el, e) { e.stopPropagation(); keepDoc(); D.docs = D.docs.filter(x => x.id != el.dataset.id); route(); toast('Dokumen dihapus') },
    saveProfile() { const n = $('#pn').value.trim(); if (n.length < 2) return toast('Nama tidak boleh kosong'); D.u.name = n; D.u.prodi = $('#pp').value.trim(); D.u.sem = $('#ps').value; const acc = LS.get(ACC, {}); if (acc[D.u.email]) { acc[D.u.email].name = n; LS.set(ACC, acc) } route(); toast('Profil disimpan') },
    clearBg() { setBg(''); LS.del('kampusai-bg'); toast('Latar belakang direset') },
    resetData(el) {
        if (!el.dataset.arm) { el.dataset.arm = 1; el.textContent = 'Yakin? Klik sekali lagi'; setTimeout(() => { el.dataset.arm = ''; el.textContent = 'Hapus semua data' }, 4000); return }
        const u = D.u; D = Object.assign(fresh(u.name, u.email), { u }); S.codeOut = ''; S.docOut = ''; S.docTitle = ''; S.dtv = undefined; S.dsv = undefined; route(); toast('Semua data dihapus')
    }
};

document.addEventListener('click', e => {
    const dd = $('#dd'); if (dd && !e.target.closest('#acct')) dd.classList.add('hide');
    let el = e.target.closest('[data-a],[data-r]'); if (!el) return; if (el.dataset.a == 'openDoc' && e.target.closest('[data-a="delDoc"]')) el = e.target.closest('[data-a="delDoc"]');
    if (el.tagName == 'A') e.preventDefault();
    if (el.closest('#dd') && dd) dd.classList.add('hide');
    if (el.dataset.r) { nav(el.dataset.r); return }
    const f = A[el.dataset.a]; if (f) f(el, e)
});
document.addEventListener('change', e => {
    if (e.target.dataset.ch == 'fm') { S.fm = e.target.value; route() }
    if (e.target.id == 'bgf') {
        const f = e.target.files[0]; if (!f) return; const img = new Image(), url = URL.createObjectURL(f);
        img.onload = () => {
            const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            const d = c.toDataURL('image/jpeg', .8); setBg(d); try { localStorage.setItem('kampusai-bg', JSON.stringify(d)); toast('Latar belakang diterapkan') } catch (_) { toast('Terpasang, tapi tidak tersimpan (gambar terlalu besar)') } URL.revokeObjectURL(url)
        }; img.src = url
    }
});
document.addEventListener('change', e => {
    if (e.target.id !== 'df') return; const f = e.target.files[0]; if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name) && !/^text\//.test(f.type)) return toast('Gunakan file .txt atau .md. Untuk PDF, salin teksnya.');
    const r = new FileReader(); r.onload = () => { $('#ds').value = String(r.result).slice(0, 60000); toast('File dimuat: ' + f.name) }; r.readAsText(f)
});
/* efek sentuh: riak, pill menonjol, kilau mengikuti jari */
document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.btn,.chips button,.seg button,.ib,.acc,.dd a,.side a');
    if (t) { const r = t.getBoundingClientRect(), z = Math.max(r.width, r.height) * 2.2, x = document.createElement('span'); x.className = 'rip'; x.style.cssText = `width:${z}px;height:${z}px;left:${e.clientX - r.left - z / 2}px;top:${e.clientY - r.top - z / 2}px`; t.appendChild(x); setTimeout(() => x.remove(), 700) }
    if (e.target.closest('.side a')) { const p = $('#pill'); p && p.classList.add('press') }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => { const p = $('#pill'); p && p.classList.remove('press') }, true));
document.addEventListener('pointermove', e => { const t = e.target.closest('.sheet,.side,.ap,.fl'); if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px') }, { passive: true });
document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return; const id = e.target.id;
    if (id == 'ci') A.chatSend(); else if (['a-name', 'a-email', 'a-pass'].includes(id)) A.submit(); else if (id == 'fb') A.setBudget(); else if (id == 'fa') A.addTx(); else if (id == 'tt') A.addTask(); else if (id == 'sn') A.addClass()
});
{ const em = LS.get(SES, null); if (em) D = loadUser(em) }
route();