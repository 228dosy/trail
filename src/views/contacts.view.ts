import { writePath } from '../services/firebase.service';
import { appState } from '../state/appState';
import type { ContactInfo } from '../types/varchas';
import { showToast } from '../utils/dom';
import { esc, friendlyError } from '../utils/format';

export function renderContactsView(container: HTMLElement): void {
  const isAdmin = appState.role === 'admin';
  const d: ContactInfo = {
    owner: appState.contactInfo.owner || 'Jiv',
    number: appState.contactInfo.number || '',
    whatsapp: appState.contactInfo.whatsapp || '',
    email: appState.contactInfo.email || '',
    instagram: appState.contactInfo.instagram || '',
  };

  const fields: Array<[keyof ContactInfo, string]> = [
    ['owner', 'Owner / Contact Name'],
    ['number', 'Phone Number'],
    ['whatsapp', 'WhatsApp'],
    ['email', 'Email'],
    ['instagram', 'Instagram'],
  ];

  const bodyHtml =
    appState.editingContacts && isAdmin
      ? `
      <div class="contact-edit-grid">
        ${fields
          .map(
            ([k, label]) => `
          <div class="field">
            <label for="contact-${k}">${label}</label>
            <input id="contact-${k}" value="${esc(d[k])}" placeholder="Add ${label.toLowerCase()}" />
          </div>
        `,
          )
          .join('')}
      </div>
      <div class="card-actions-end">
        <button type="button" class="btn btn-ghost" id="cancelContactEditBtn">Cancel</button>
        <button type="button" class="btn btn-gold" id="saveContactsBtn">Save details</button>
      </div>
    `
      : `
      <div class="contact-lines">
        ${fields
          .map(
            ([k, label]) => `
          <div class="contact-line">
            <span class="contact-key">${label}</span>
            <strong class="contact-val">${esc(d[k] || 'Not added yet')}</strong>
          </div>
        `,
          )
          .join('')}
      </div>
    `;

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">Official Content · Owner Profile</div>
          <h2>OFFICIAL CONTACTS</h2>
        </div>
      </div>

      <section class="panel official-card">
        <div class="official-card-head">
          <div>
            <span class="eyebrow">VARCHAS Broadcast Production</span>
            <h3 class="official-owner-name">${esc(d.owner || 'Owner')}</h3>
            <p class="hint">Owner &amp; broadcast developer</p>
          </div>
          ${
            isAdmin && !appState.editingContacts
              ? `<button type="button" class="btn btn-gold btn-sm" id="editContactsBtn">Edit</button>`
              : ''
          }
        </div>
        ${bodyHtml}
      </section>
    </div>
  `;

  container.querySelector('#editContactsBtn')?.addEventListener('click', () => {
    if (!isAdmin) return;
    appState.editingContacts = true;
    renderContactsView(container);
  });

  container.querySelector('#cancelContactEditBtn')?.addEventListener('click', () => {
    appState.editingContacts = false;
    renderContactsView(container);
  });

  container.querySelector('#saveContactsBtn')?.addEventListener('click', async () => {
    if (!isAdmin || !appState.user || appState.user.uid !== appState.adminUidCache) {
      showToast('Only the master owner can edit this card.');
      return;
    }
    const next: ContactInfo = {
      owner: container.querySelector<HTMLInputElement>('#contact-owner')?.value.trim() || '',
      number: container.querySelector<HTMLInputElement>('#contact-number')?.value.trim() || '',
      whatsapp: container.querySelector<HTMLInputElement>('#contact-whatsapp')?.value.trim() || '',
      email: container.querySelector<HTMLInputElement>('#contact-email')?.value.trim() || '',
      instagram: container.querySelector<HTMLInputElement>('#contact-instagram')?.value.trim() || '',
    };
    try {
      await writePath('pcr/system/contacts', next);
      appState.contactInfo = next;
      appState.editingContacts = false;
      renderContactsView(container);
      showToast('Official contact details updated.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });
}
