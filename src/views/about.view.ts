import { writePath } from '../services/firebase.service';
import { appState, DEFAULT_ABOUT_US } from '../state/appState';
import type { AboutEcosystemBox, AboutUsData } from '../types/varchas';
import { showToast } from '../utils/dom';
import { esc, friendlyError } from '../utils/format';

export function renderAboutView(container: HTMLElement): void {
  const isAdmin = appState.role === 'admin';
  const data: AboutUsData = {
    headline: appState.aboutUs?.headline || DEFAULT_ABOUT_US.headline,
    subtitle: appState.aboutUs?.subtitle || DEFAULT_ABOUT_US.subtitle,
    boxes:
      Array.isArray(appState.aboutUs?.boxes) && appState.aboutUs.boxes.length
        ? appState.aboutUs.boxes
        : DEFAULT_ABOUT_US.boxes,
  };

  if (appState.editingAboutUs && isAdmin) {
    container.innerHTML = `
      <div class="page-wrap">
        <div class="page-header">
          <div>
            <div class="eyebrow">VARCHAS Ecosystem · Admin Editor</div>
            <h2>EDIT ABOUT US</h2>
          </div>
        </div>

        <section class="panel section-card">
          <div class="fields-2">
            <div class="field">
              <label for="aboutHeadlineInput">Section Headline</label>
              <input id="aboutHeadlineInput" value="${esc(data.headline)}" maxlength="80" />
            </div>
            <div class="field">
              <label for="aboutSubtitleInput">Section Subtitle</label>
              <input id="aboutSubtitleInput" value="${esc(data.subtitle)}" maxlength="220" />
            </div>
          </div>

          <div class="about-edit-grid">
            ${data.boxes
              .map(
                (box, idx) => `
              <div class="about-edit-box">
                <div class="field">
                  <label>Box ${idx + 1} Title</label>
                  <input id="aboutBoxTitle-${idx}" value="${esc(box.title)}" maxlength="48" />
                </div>
                <div class="field">
                  <label>Box ${idx + 1} Tag</label>
                  <input id="aboutBoxTag-${idx}" value="${esc(box.tag)}" maxlength="40" />
                </div>
                <div class="field">
                  <label>Box ${idx + 1} Description</label>
                  <textarea id="aboutBoxDesc-${idx}" rows="3" maxlength="500">${esc(
                    box.description,
                  )}</textarea>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>

          <div class="card-actions-end" style="margin-top:16px">
            <button type="button" class="btn btn-ghost" id="cancelAboutEditBtn">Cancel</button>
            <button type="button" class="btn btn-gold" id="saveAboutBtn">Save About Us</button>
          </div>
        </section>
      </div>
    `;

    container.querySelector('#cancelAboutEditBtn')?.addEventListener('click', () => {
      appState.editingAboutUs = false;
      renderAboutView(container);
    });

    container.querySelector('#saveAboutBtn')?.addEventListener('click', async () => {
      if (!isAdmin || !appState.user || appState.user.uid !== appState.adminUidCache) {
        showToast('Only Admin can edit About Us.');
        return;
      }
      const nextBoxes: AboutEcosystemBox[] = data.boxes.map((b, idx) => ({
        id: b.id,
        title:
          container.querySelector<HTMLInputElement>(`#aboutBoxTitle-${idx}`)?.value.trim() ||
          b.title,
        tag:
          container.querySelector<HTMLInputElement>(`#aboutBoxTag-${idx}`)?.value.trim() || b.tag,
        description:
          container.querySelector<HTMLTextAreaElement>(`#aboutBoxDesc-${idx}`)?.value.trim() || '',
      }));
      const next: AboutUsData = {
        headline:
          container.querySelector<HTMLInputElement>('#aboutHeadlineInput')?.value.trim() ||
          DEFAULT_ABOUT_US.headline,
        subtitle:
          container.querySelector<HTMLInputElement>('#aboutSubtitleInput')?.value.trim() || '',
        boxes: nextBoxes,
      };
      try {
        await writePath('pcr/system/aboutUs', next);
        appState.aboutUs = next;
        appState.editingAboutUs = false;
        renderAboutView(container);
        showToast('About Us ecosystem content saved.');
      } catch (e) {
        showToast(friendlyError(e));
      }
    });
    return;
  }

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">Ecosystem Architecture</div>
          <h2>ABOUT VARCHAS</h2>
        </div>
        ${
          isAdmin
            ? `<button type="button" class="btn btn-gold btn-sm" id="editAboutBtn">Edit</button>`
            : ''
        }
      </div>

      <section class="panel about-hero-panel">
        <h3>${esc(data.headline)}</h3>
        <p>${esc(data.subtitle)}</p>
      </section>

      <div class="about-grid">
        ${data.boxes
          .map(
            (box) => `
          <article class="panel about-box about-box-${esc(box.id)}">
            <div class="about-box-header">
              <span class="about-box-tag">${esc(box.tag)}</span>
            </div>
            <h4>${esc(box.title)}</h4>
            <p>${esc(box.description)}</p>
          </article>
        `,
          )
          .join('')}
      </div>
    </div>
  `;

  container.querySelector('#editAboutBtn')?.addEventListener('click', () => {
    if (!isAdmin) return;
    appState.editingAboutUs = true;
    renderAboutView(container);
  });
}
