/* Gym.js
   Vers. 1.0
   يحوي وظائف لحفظ العملاء، عرض القوائم، وفتح صفحة العميل مع تحقق بالكود.
   احفظ هذا الملف باسم Gym.js وضعه في نفس مجلد صفحات الـ HTML.
*/

const Gym = (function () {
  'use strict';

  const STORAGE_KEYS = {
    CLIENTS: 'kabtin_clients_v1',
    PUBLIC: 'kabtin_public_v1'
  };

  /* ---------- مساعدات ---------- */

  function _readClients() {
    // ترحيل إذا كانت بيانات قديمة تحت مفتاح 'players'
    const old = localStorage.getItem('players');
    if (old && !localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      try {
        const parsed = JSON.parse(old);
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(parsed));
      } catch (e) { /* ignore */ }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');
  }

  function _writeClients(arr) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(arr));
  }

  function _getById(id) {
    if (!id) return null;
    return _readClients().find(c => String(c.id) === String(id)) || null;
  }

  function _toBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = err => reject(err);
      fr.readAsDataURL(file);
    });
  }

  /* ---------- عمليات العميل ---------- */

  /**
   * saveClient: يحفظ كائن عميل
   * @param {Object} clientData - {name, password, diet, supplements, exercises, photoFile}
   * @returns {Promise<Object>} client (المخزن)
   */
  async function saveClient(clientData) {
    const clients = _readClients();
    const id = clientData.id || Date.now();
    let photoData = clientData.photo || '';
    if (clientData.photoFile) {
      // يحوّل الصورة إلى base64 ليبقى محفوظ بين الجلسات
      try {
        photoData = await _toBase64(clientData.photoFile);
      } catch (e) {
        console.warn('Image conversion failed', e);
        photoData = '';
      }
    }

    const newClient = {
      id,
      name: (clientData.name || '').trim(),
      password: (clientData.password || '').trim(),
      diet: clientData.diet || '',
      supplements: clientData.supplements || '',
      exercises: clientData.exercises || '',
      photo: photoData
    };

    // إذا كان ID موجود بالفعل -> تعديل، وإلا إضافة
    const existsIndex = clients.findIndex(c => String(c.id) === String(id));
    if (existsIndex >= 0) {
      clients[existsIndex] = newClient;
    } else {
      clients.push(newClient);
    }

    _writeClients(clients);
    return newClient;
  }

  /* ---------- واجهات DOM جاهزة للاستخدام ---------- */

  // (1) handle form submit on captain pages (form id="form")
  async function handleCaptainFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    // تحاول العثور على الفورم
    const form = (e && e.target) || document.getElementById('form');
    if (!form) {
      console.error('form not found for handleCaptainFormSubmit');
      return;
    }

    const name = (form.querySelector('[name="name"]')?.value || '').trim();
    const password = (form.querySelector('[name="password"]')?.value || '').trim();
    const diet = (form.querySelector('[name="diet"]')?.value || '').trim();
    const supplements = (form.querySelector('[name="supplements"]')?.value || '').trim();
    const exercises = (form.querySelector('[name="exercises"]')?.value || '').trim();
    const photoFile = form.querySelector('[name="photo"]')?.files?.[0] || null;

    if (!name || !password) {
      alert('❌ اكتب اسم العميل والكود السري على الأقل');
      return;
    }

    try {
      await saveClient({ name, password, diet, supplements, exercises, photoFile });
      form.reset();
      // إعادة عرض القائمة إن كانت موجودة
      renderClientsList();
      // إن أردت رساله نجاح:
      // alert('تم حفظ العميل بنجاح');
    } catch (err) {
      console.error('saveClient error', err);
      alert('❌ حدث خطأ أثناء حفظ العميل');
    }
  }

  /**
   * renderClientsList
   * @param {String|Element} container - id العنصر أو العنصر نفسه (افتراضي: 'clients' أو 'list')
   */
  function renderClientsList(container) {
    const clients = _readClients();
    let containerEl = null;
    if (typeof container === 'string') containerEl = document.getElementById(container);
    else if (container instanceof Element) containerEl = container;
    else containerEl = document.getElementById('clients') || document.getElementById('list');

    if (!containerEl) {
      // لا عنصر للعرض -> لا تفعل شيئاً
      return;
    }

    containerEl.innerHTML = '';
    if (!clients.length) {
      containerEl.innerHTML = `<p style="color:#ccc; text-align:center;">لا يوجد عملاء محفوظين بعد</p>`;
      return;
    }

    clients.forEach(c => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `client.html?id=${c.id}`;
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '15px';
      card.style.textDecoration = 'none';
      card.style.color = 'inherit';

      const img = document.createElement('img');
      img.src = c.photo || 'https://via.placeholder.com/70';
      img.alt = c.name || 'client';

      const textDiv = document.createElement('div');
      const h = document.createElement('h3');
      h.innerText = `👤 ${c.name}`;
      const p = document.createElement('p');
      p.style.margin = '6px 0 0';
      p.style.color = '#ccc';
      p.style.fontSize = '14px';
      p.innerText = c.diet ? `🍽 ${c.diet.slice(0, 60)}${c.diet.length > 60 ? '...' : ''}` : 'لم يتم إدخال نظام غذائي';

      textDiv.appendChild(h);
      textDiv.appendChild(p);

      card.appendChild(img);
      card.appendChild(textDiv);

      containerEl.appendChild(card);
    });
  }

  /* ---------- صفحة العميل (client.html) ---------- */

  /**
   * clientPageInit
   * يحضر صفحة العميل: يربط زر الدخول بالتحقق من الكود ويعرض البيانات لو صح
   * سيستخدم افتراضياً العناصر التي استخدمتها سابقاً: passwordInput, loginBox, clientData, clientName, clientPhoto, diet, supplements, exercises
   */
  function clientPageInit(opts = {}) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || opts.id;
    if (!id) {
      const noIdContainer = document.getElementById('clientCard') || document.getElementById('clientData') || document.body;
      noIdContainer.innerHTML = '<p style="color:salmon; text-align:center;">رابط العميل غير صحيح (لا يوجد id)</p>';
      return;
    }

    const client = _getById(id);
    if (!client) {
      const noClient = document.getElementById('clientCard') || document.getElementById('clientData') || document.body;
      noClient.innerHTML = '<p style="color:salmon; text-align:center;">❌ العميل غير موجود</p>';
      return;
    }

    // نعرّف دالة تحقق عامة window.checkPassword() لدعم النداءات القديمة في HTML
    window.checkPassword = function () {
      const passInput = document.getElementById(opts.passwordInputId || 'passwordInput');
      const entered = passInput ? (passInput.value || '').trim() : prompt('أدخل الكود السري:');
      if (entered === client.password) {
        // عرض البيانات
        _showClientDataOnPage(client, opts);
      } else {
        alert('❌ الكود السري غير صحيح');
      }
    };

    // لو موجود زر داخل #loginBox نربطها
    const loginBtn = document.querySelector('#loginBox button') || document.querySelector('[data-client-login]');
    if (loginBtn) {
      loginBtn.addEventListener('click', window.checkPassword);
    }

    // لو المستخدم يريد إدخال الكود في نموذج يمكن الضغط Enter
    const passField = document.getElementById(opts.passwordInputId || 'passwordInput');
    if (passField) {
      passField.addEventListener('keypress', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          window.checkPassword();
        }
      });
    }
  }

  function _showClientDataOnPage(client, opts = {}) {
    // اخفاء مربع الدخول إن وُجد
    const loginBox = document.getElementById('loginBox');
    if (loginBox) loginBox.style.display = 'none';

    // العنصر الذي سيعرض البيانات (افتراضياً #clientData أو #clientCard)
    const container = document.getElementById('clientData') || document.getElementById('clientCard') || null;

    if (container) {
      container.style.display = 'block';
      // املأ العناصر الافتراضية إن وُجدت
      const nameEl = document.getElementById('clientName');
      if (nameEl) nameEl.innerText = `👤 ${client.name}`;

      const photoEl = document.getElementById('clientPhoto');
      if (photoEl) {
        if (client.photo) photoEl.src = client.photo;
        else photoEl.src = 'https://via.placeholder.com/300x180?text=No+Image';
      }

      const dietEl = document.getElementById('diet');
      if (dietEl) dietEl.innerText = client.diet || 'لا يوجد';

      const suppEl = document.getElementById('supplements');
      if (suppEl) suppEl.innerText = client.supplements || 'لا يوجد';

      const exEl = document.getElementById('exercises');
      if (exEl) exEl.innerText = client.exercises || 'لا يوجد';

      // لو لا توجد عناصر افتراضية، نُظهر كارت كامل تلقائياً داخل الحاوية
      if (!nameEl && !photoEl && !dietEl && !suppEl && !exEl) {
        container.innerHTML = `
          <h2 style="color:#FFD700">👤 ${escapeHtml(client.name)}</h2>
          ${client.photo ? `<img src="${client.photo}" style="max-width:360px;border-radius:12px;border:2px solid gold" />` : ''}
          <div style="text-align:right;margin-top:12px">
            <p><b>🍽 النظام الغذائي:</b><br/> ${escapeHtml(client.diet || 'لا يوجد')}</p>
            <p><b>💊 المكملات:</b><br/> ${escapeHtml(client.supplements || 'لا يوجد')}</p>
            <p><b>🏋️‍♂️ التمارين:</b><br/> ${escapeHtml(client.exercises || 'لا يوجد')}</p>
          </div>
        `;
      }
    } else {
      // إن لم يوجد حاوية نعرض تنبيه
      alert('تم التحقق ✅ — الكود صحيح. (لكن الصفحة لا تمتلك حاوية لعرض البيانات).');
      console.log('client data', client);
    }
  }

  /* ---------- بيانات عامة (public.html) ---------- */

  function savePublicData(diet, workout) {
    const obj = { diet: diet || '', workout: workout || '', updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.PUBLIC, JSON.stringify(obj));
  }

  function renderPublicData(containerId = 'publicPreview') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.PUBLIC) || 'null');
    if (!data) {
      el.innerHTML = `<p style="color:#ccc">لا يوجد نظام موحد محفوظ بعد.</p>`;
      return;
    }
    el.innerHTML = `
      <h3 style="color: #00FFAA">📌 النظام الموحد</h3>
      <p><b>🍽 الدايت:</b><br>${escapeHtml(data.diet)}</p>
      <p><b>🏋️‍♂️ التمارين:</b><br>${escapeHtml(data.workout)}</p>
    `;
  }

  /* ---------- Utilities ---------- */

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- Auto init عند تحميل الصفحة (إن وُجدت عناصر معروفة) ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    // ربط فورم الكابتن فوراً لو موجود <form id="form">
    const captainForm = document.getElementById('form');
    if (captainForm) {
      captainForm.addEventListener('submit', handleCaptainFormSubmit);
    }

    // عرض قائمة العملاء إذا وُجد عنصر id="clients" أو id="list"
    if (document.getElementById('clients') || document.getElementById('list')) {
      renderClientsList(); // يعثر على العنصر الداخلي أو الافتراضي
    }

    // لو هذه صفحة العميل (يوجد param id في العنوان) — نفعل init تلقائياً لو توجد عناصر loginBox أو passwordInput
    if (new URLSearchParams(window.location.search).has('id')) {
      // نحاول تهيئة صفحة العميل. (ستربط window.checkPassword تلقائياً)
      clientPageInit();
    }

    // لو وُجد عنصر publicPreview — عرض بيانات العامة
    if (document.getElementById('publicPreview')) {
      renderPublicData('publicPreview');
    }
  });

  // واجهة خارجية
  return {
    saveClient,
    handleCaptainFormSubmit,
    renderClientsList,
    clientPageInit,
    savePublicData,
    renderPublicData,
    getClientById: _getById
  };
})();
