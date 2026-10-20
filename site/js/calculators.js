// Mortgage calculators. Loaded only on /calculators/{slug}. The assumptions come from the admin
// (Website → Calculators) via data-config; the maths is exported for tests as window.ZingaCalc.
(function () {
  var gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  var gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(n) { var r = Math.round(n); return gbp.format(r === 0 ? 0 : r); } // no "-£0"
  function pct(n) { return (Math.round(n * 100) / 100).toString() + '%'; }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }

  // Standard monthly repayment (capital & interest).
  function monthlyRepayment(principal, annualRate, years) {
    var n = Math.round(years * 12);
    if (principal <= 0 || n <= 0) return 0;
    var i = annualRate / 100 / 12;
    if (i === 0) return principal / n;
    return principal * i / (1 - Math.pow(1 + i, -n));
  }

  // Tax on a price across progressive bands [{from, rate}], with an optional surcharge added to every band.
  function bandedTax(price, bands, surcharge) {
    var sorted = bands.slice().sort(function (a, b) { return a.from - b.from; });
    var rows = [], total = 0;
    for (var k = 0; k < sorted.length; k++) {
      var from = Number(sorted[k].from), to = k + 1 < sorted.length ? Number(sorted[k + 1].from) : Infinity;
      if (price <= from) break;
      var portion = Math.min(price, to) - from;
      var rate = Number(sorted[k].rate) + (surcharge || 0);
      var tax = portion * rate / 100;
      total += tax;
      rows.push({ from: from, to: Math.min(price, to), rate: rate, tax: tax });
    }
    return { total: total, rows: rows };
  }

  var calcs = {
    borrowing: function (v, c) {
      var income = num(v.income1) + num(v.income2), deposit = num(v.deposit);
      var low = income * c.multiple_low, high = income * c.multiple_high;
      var r = {
        low: money(low), high: money(high), priceLow: money(low + deposit), priceHigh: money(high + deposit),
        ltv: high + deposit > 0 ? pct(high / (high + deposit) * 100) : '—', income: money(income),
      };
      r.summary = 'Income ' + money(income) + ', deposit ' + money(deposit) + ' → could borrow ' + r.low + '–' + r.high + ' (budget ' + r.priceLow + '–' + r.priceHigh + ').';
      return r;
    },

    repayments: function (v, c) {
      var amount = num(v.amount), rate = num(v.rate), term = num(v.term), io = v.type === 'interest';
      var pay = function (r) { return io ? amount * r / 100 / 12 : monthlyRepayment(amount, r, term); };
      var monthly = pay(rate), months = Math.round(term * 12);
      var total = monthly * months + (io ? amount : 0);
      var valid = amount > 0 && (io || months > 0);
      if (!valid) return { monthly: '—', interest: '—', total: '—', rate1: 'At ' + pct(rate + 1), monthly1: '—', rate2: 'At ' + pct(rate + 2), monthly2: '—', summary: '' };
      var r = {
        monthly: gbp2.format(monthly), interest: money(Math.max(0, total - amount)), total: money(total),
        rate1: 'At ' + pct(rate + 1), monthly1: gbp2.format(pay(rate + 1)) + ' a month',
        rate2: 'At ' + pct(rate + 2), monthly2: gbp2.format(pay(rate + 2)) + ' a month',
      };
      r.summary = money(amount) + ' over ' + term + ' years at ' + pct(rate) + (io ? ' (interest only)' : ' (repayment)') + ' → ' + r.monthly + ' a month.';
      return r;
    },

    'stamp-duty': function (v, c) {
      var price = num(v.price), buyer = v.buyer || 'ftb', note = '', result;
      if (buyer === 'ftb' && price <= c.ftb_max_price) {
        result = bandedTax(price, c.ftb_bands, 0);
        note = 'Includes first-time buyer relief.';
      } else {
        var surcharge = buyer === 'additional' && price >= 40000 ? Number(c.additional_surcharge) : 0;
        result = bandedTax(price, c.standard_bands, surcharge);
        if (buyer === 'ftb') note = 'First-time buyer relief doesn’t apply above ' + money(c.ftb_max_price) + ', so standard rates are used.';
        if (surcharge) note = 'Includes the ' + pct(surcharge) + ' surcharge for additional properties.';
      }
      var r = {
        tax: money(result.total), note: note,
        effective: price > 0 ? pct(result.total / price * 100) : '—',
        bands: result.rows.map(function (row) {
          return [money(row.from) + ' – ' + money(row.to), pct(row.rate), money(row.tax)];
        }),
      };
      var labels = { ftb: 'first-time buyer', mover: 'moving home', additional: 'additional property' };
      r.summary = 'Price ' + money(price) + ' (' + labels[buyer] + ') → Stamp Duty ' + r.tax + '.';
      return r;
    },

    remortgage: function (v, c) {
      var balance = num(v.balance), term = num(v.term), fees = num(v.fees);
      var now = monthlyRepayment(balance, num(v.current), term), next = monthlyRepayment(balance, num(v.new), term);
      var saving = now - next;
      var r = {
        currentMonthly: gbp2.format(now), newMonthly: gbp2.format(next),
        saving: saving > 0 ? gbp2.format(saving) : gbp2.format(0),
        twoYear: saving * 24 - fees > 0.5 ? money(saving * 24 - fees) : 'No saving',
        fiveYear: saving * 60 - fees > 0.5 ? money(saving * 60 - fees) : 'No saving',
        breakeven: saving > 0 ? (fees > 0 ? Math.ceil(fees / saving) + (Math.ceil(fees / saving) === 1 ? ' month' : ' months') : 'Straight away') : '—',
        note: saving > 0 ? (saving * 60 - fees <= 0.5 ? 'The fees are more than you’d save over five years at this rate.' : '')
          : 'The new rate isn’t lower than your current one, so switching wouldn’t cut your payment.',
      };
      r.summary = 'Balance ' + money(balance) + ', ' + term + ' years left, ' + pct(num(v.current)) + ' → ' + pct(num(v.new)) + ', fees ' + money(fees) + ' → saves ' + r.saving + ' a month (' + r.twoYear + ' over 2 years after fees).';
      return r;
    },

    'buy-to-let': function (v, c) {
      var rent = num(v.rent), value = num(v.value), icr = v.band === 'higher' ? Number(c.icr_higher) : Number(c.icr_basic);
      var stress = Number(c.stress_rate);
      var byRent = icr > 0 && stress > 0 ? rent * 12 / (icr / 100) / (stress / 100) : 0; // admin settings must be > 0
      var byLtv = value * Number(c.max_ltv) / 100;
      var max = value > 0 ? Math.min(byRent, byLtv) : byRent;
      var r = {
        max: money(max), byRent: money(byRent), byLtv: value > 0 ? money(byLtv) : '—',
        deposit: value > 0 ? money(Math.max(0, value - max)) : '—',
        icr: pct(icr) + ' at ' + pct(Number(c.stress_rate)),
        note: value > 0 && rent > 0 ? (byRent < byLtv ? 'The rent is what limits the loan here.' : 'The loan-to-value limit is what caps the loan here.') : '',
      };
      r.summary = 'Rent ' + money(rent) + '/month, value ' + money(value) + ', ' + (v.band === 'higher' ? 'higher' : 'basic') + '-rate → could borrow up to ' + r.max + '.';
      return r;
    },

    overpayment: function (v, c) {
      var balance = num(v.balance), rate = num(v.rate), term = num(v.term), extra = num(v.monthly), lump = Math.min(num(v.lump), balance);
      var payment = monthlyRepayment(balance, rate, term), i = rate / 100 / 12, months = Math.round(term * 12);
      var baseInterest = Math.max(0, payment * months - balance);
      // Month by month with the lump sum off up front and the extra added to every payment.
      var bal = balance - lump, n = 0, interest = 0;
      while (bal > 0.005 && n < 1200) {
        var int = bal * i;
        var pay = Math.min(bal + int, payment + extra);
        interest += int; bal = bal + int - pay; n++;
        if (payment + extra <= int) { n = Infinity; break; }
      }
      var valid = balance > 0 && months > 0;
      var saved = valid ? Math.max(0, baseInterest - interest) : 0, less = valid && isFinite(n) ? Math.max(0, months - n) : 0;
      var free = new Date(); free.setDate(1); free.setMonth(free.getMonth() + (isFinite(n) ? n : months)); // day 1 so months don't roll over
      var yrs = Math.floor(less / 12), mos = less % 12;
      var yearly = extra * 12 + lump, allowance = balance * Number(c.allowance_pct) / 100;
      var r = {
        saved: money(saved), payment: gbp2.format(payment), baseInterest: money(valid ? baseInterest : 0), newInterest: money(valid ? interest : 0),
        timeSaved: less ? (yrs ? yrs + (yrs === 1 ? ' year' : ' years') : '') + (yrs && mos ? ', ' : '') + (mos ? mos + (mos === 1 ? ' month' : ' months') : '')
          : (saved >= 1 ? 'Less than a month' : '—'),
        freeDate: valid ? free.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—',
        note: yearly > allowance && allowance > 0 ? 'That’s more than ' + pct(Number(c.allowance_pct)) + ' of your balance in the first year (' + money(allowance) + '), so check your lender’s overpayment allowance and any early repayment charge.' : '',
      };
      r.summary = 'Balance ' + money(balance) + ' at ' + pct(rate) + ', ' + term + ' years left, overpaying ' + money(extra) + '/month' + (lump ? ' + ' + money(lump) + ' lump sum' : '') + ' → saves ' + r.saved + ' interest, ' + r.timeSaved + ' sooner.';
      return r;
    },

    'btl-rental': function (v, c) {
      var loan = num(v.loan), stress = Number(c.stress_rate) / 100;
      var rentFor = function (icr) { return loan * stress * Math.max(0, icr) / 100 / 12; };
      var icr = v.band === 'higher' ? Number(c.icr_higher) : Number(c.icr_basic);
      var r = {
        rent: money(rentFor(icr)), yearly: money(rentFor(icr) * 12), icr: pct(icr) + ' at ' + pct(Number(c.stress_rate)),
        rentBasic: money(rentFor(Number(c.icr_basic))) + ' a month', rentHigher: money(rentFor(Number(c.icr_higher))) + ' a month',
      };
      r.summary = 'Loan ' + money(loan) + ', ' + (v.band === 'higher' ? 'higher' : 'basic') + '-rate → rent needed about ' + r.rent + '/month.';
      return r;
    },
  };

  window.ZingaCalc = { calcs: calcs, monthlyRepayment: monthlyRepayment, bandedTax: bandedTax };

  var root = document.querySelector('[data-calc]');
  if (!root) return;
  var type = root.getAttribute('data-calc');
  var config;
  try { config = JSON.parse(root.getAttribute('data-config') || '{}'); } catch (e) { return; }
  var form = root.querySelector('[data-calc-form]');
  var summaryField = document.querySelector('[data-calc-summary]');

  function values() {
    var v = {};
    form.querySelectorAll('[data-in]').forEach(function (el) {
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      v[el.getAttribute('data-in')] = el.value;
    });
    return v;
  }

  function render() {
    if (!calcs[type]) return;
    var r = calcs[type](values(), config);
    Object.keys(r).forEach(function (key) {
      root.querySelectorAll('[data-out="' + key + '"]').forEach(function (el) { el.textContent = r[key]; });
      root.querySelectorAll('[data-out-rows="' + key + '"]').forEach(function (tbody) {
        tbody.textContent = '';
        r[key].forEach(function (cells) {
          var tr = document.createElement('tr');
          cells.forEach(function (text) { var td = document.createElement('td'); td.textContent = text; tr.appendChild(td); });
          tbody.appendChild(tr);
        });
      });
    });
    if (summaryField) summaryField.value = r.summary || '';
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
  render();

  // Mark the page so analytics can tell someone used the calculator (once per page view).
  var used = false;
  form.addEventListener('input', function () {
    if (used || !window.dataLayer) return;
    used = true;
    window.dataLayer.push({ event: 'calculator_use', location: type });
  });

  // After a failed lead submit the page reloads; bring the form back into view.
  var alert = document.querySelector('#get-advice .form-alert');
  if (alert) document.getElementById('get-advice').scrollIntoView();
})();
