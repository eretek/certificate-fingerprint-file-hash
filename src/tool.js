/*! Eretek Online Araçlar #68 — Sertifika Fingerprint ve Dosya Hash */
ERT.def('68', {
	run: function (v, c) {
		var A = ERT.asn1, bytes, kind, name = '';
		if (v.file && v.file.data) { bytes = Array.from(new Uint8Array(v.file.data)); kind = 'file'; name = v.file.name; }
		else if (v.pem && /-----BEGIN/.test(v.pem)) {
			var b; try { b = A.pem(v.pem); } catch (e) { throw c.fe('pem', 'b64'); }
			b = b.filter(function (q) { return q.label === 'CERTIFICATE'; });
			if (!b.length) { throw c.fe('pem', 'noCert'); }
			bytes = b[0].der; kind = 'cert';
		} else if (v.txt) { bytes = Array.from(new TextEncoder().encode(v.txt)); kind = 'txt'; }
		else { throw c.fe('file', 'none'); }
		var algs = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'], jobs = algs.map(function (a) { return A.digest(a, bytes); }), spki = null;
		if (kind === 'cert') {
			var top = A.read(bytes, 0), tbs = top.kids[0], k = tbs.kids, i = k[0].cls === 2 ? 1 : 0, sp = k[i + 5];
			spki = bytes.slice(sp.start, sp.end); jobs.push(A.digest('SHA-256', spki));
		}
		return Promise.all(jobs).then(function (h) {
			var kv = [], vv = {}, msgs = [];
			algs.forEach(function (a, i) { kv.push([a + (a === 'SHA-1' ? ' (' + c.t('legacy') + ')' : ''), h[i]]); vv[a.replace('-', '').toLowerCase()] = h[i].replace(/:/g, '').toLowerCase(); });
			if (spki) { var raw = h[4].split(':').map(function (x) { return String.fromCharCode(parseInt(x, 16)); }).join(''), pin = btoa(raw); kv.push([c.t('pin'), 'sha256/' + pin]); vv.pin = pin; }
			kv.unshift([c.t('src'), c.t('k_' + kind, { n: name }) + ' · ' + c.n(bytes.length, 0) + ' B']);
			if (v.expect) {
				var e = v.expect.replace(/^(sha(1|256|384|512)[:=]\s*)/i, '').replace(/[\s:]/g, '').toLowerCase(), hit = null;
				Object.keys(vv).forEach(function (k) { if (vv[k] === e) { hit = k; } });
				vv.match = hit !== null; msgs.push(hit ? ['ok', c.t('match', { a: hit.toUpperCase() })] : ['err', c.t('noMatch')]);
			}
			if (kind === 'cert') { msgs.push(['info', c.t('certNote')]); }
			if (kind === 'txt') { msgs.push(['info', c.t('txtNote')]); }
			msgs.push(['info', c.t('sha1')], ['info', c.t('local')]);
			return { big: 'SHA-256: ' + h[0].replace(/:/g, '').toLowerCase(), kv: kv, msgs: msgs, x: { copy: kv.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') }, v: vv };
		});
	}
});
