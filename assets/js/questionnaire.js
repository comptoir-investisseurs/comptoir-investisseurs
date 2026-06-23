/* Questionnaire multi-step logic — LFDR */
(function(){
  'use strict';

  const steps = document.querySelectorAll('.q-step');
  const dots  = document.querySelectorAll('.progress__step');
  const fill  = document.querySelector('.progress__fill');
  const totalSteps = steps.length;
  let current = 0;

  function showStep(idx){
    steps.forEach((s,i) => s.classList.toggle('is-visible', i === idx));
    dots.forEach((d,i) => {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    if(fill) fill.style.width = (idx / (totalSteps - 1) * 100) + '%';
    current = idx;
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function validateStep(idx){
    const step = steps[idx];
    let valid = true;
    step.querySelectorAll('[required]').forEach(el => {
      const field = el.closest('.q-field');
      if(!field) return;
      if(el.type === 'checkbox'){
        if(!el.checked){ field.classList.add('has-error'); valid = false; }
        else field.classList.remove('has-error');
      } else if(!el.value.trim()){
        field.classList.add('has-error'); valid = false;
      } else {
        field.classList.remove('has-error');
      }
    });

    step.querySelectorAll('[data-required-group]').forEach(group => {
      const checked = group.querySelectorAll('input:checked').length > 0;
      if(!checked){ group.classList.add('has-error'); valid = false; }
      else group.classList.remove('has-error');
    });

    return valid;
  }

  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(validateStep(current) && current < totalSteps - 1) showStep(current + 1);
    });
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(current > 0) showStep(current - 1);
    });
  });

  document.querySelectorAll('.q-option input[type="radio"]').forEach(r => {
    r.addEventListener('change', () => {
      const group = r.closest('.q-options');
      group.querySelectorAll('.q-option').forEach(o => o.classList.remove('is-selected'));
      r.closest('.q-option').classList.add('is-selected');
    });
  });
  document.querySelectorAll('.q-option input[type="checkbox"]').forEach(c => {
    c.addEventListener('change', () => {
      c.closest('.q-option').classList.toggle('is-selected', c.checked);
    });
  });

  function collectData(){
    const data = {};
    document.querySelectorAll('#questionnaire input, #questionnaire select, #questionnaire textarea').forEach(el => {
      if(!el.name) return;
      if(el.type === 'radio'){
        if(el.checked) data[el.name] = el.value;
      } else if(el.type === 'checkbox'){
        if(!data[el.name]) data[el.name] = [];
        if(el.checked) data[el.name].push(el.value);
      } else {
        data[el.name] = el.value;
      }
    });
    // Convert boolean consent fields
    data.consentement_rgpd = (data.consentement_rgpd && data.consentement_rgpd.length > 0);
    data.consentement_commercial = (data.consentement_commercial && data.consentement_commercial.length > 0);
    // Parse nb_enfants as integer
    if(data.nb_enfants) data.nb_enfants = parseInt(data.nb_enfants, 10) || 0;
    return data;
  }

  function showSuccess(){
    document.querySelector('.q-body').style.display = 'none';
    document.querySelector('.q-hero').style.display = 'none';
    document.getElementById('q-success').style.display = 'block';
  }

  function showError(msg){
    const status = document.getElementById('q-submit-status');
    if(status){
      status.textContent = msg;
      status.style.display = 'block';
    }
  }

  const form = document.getElementById('questionnaire');
  if(form) form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!validateStep(current)) return;

    const data = collectData();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    if(!SUPABASE_URL || SUPABASE_URL.includes('VOTRE_PROJET')){
      console.log('Mode démo — données:', data);
      setTimeout(showSuccess, 600);
      return;
    }

    fetch(SUPABASE_URL + '/rest/v1/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    })
    .then(res => {
      if(!res.ok) throw new Error('Erreur ' + res.status);
      showSuccess();
    })
    .catch(err => {
      console.error(err);
      btn.disabled = false;
      btn.textContent = 'Valider mon questionnaire';
      showError('Une erreur est survenue. Veuillez réessayer ou nous contacter directement.');
    });
  });

  showStep(0);
})();
