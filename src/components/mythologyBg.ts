export type MythSceneId =
  | 'login'
  | 'hub'
  | 'setup'
  | 'matches'
  | 'contacts'
  | 'about'
  | 'history'
  | 'settings'
  | 'controller';

function sceneSvg(scene: MythSceneId): string {
  switch (scene) {
    case 'login':
      // Lord Ganesha silhouette & sacred lotus geometry
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="ganeshaGlow" cx="72%" cy="38%" r="48%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
            <stop offset="65%" stop-color="#8b5cf6" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#ganeshaGlow)"/>
        <g class="myth-drift-slow" opacity="0.22" stroke="#f59e0b" fill="none" stroke-width="1.5">
          <circle cx="860" cy="290" r="175" stroke-dasharray="6 10"/>
          <circle cx="860" cy="290" r="132"/>
          <path d="M860 110 L880 152 L840 152 Z"/>
          <path d="M860 470 L880 428 L840 428 Z"/>
        </g>
        <g class="myth-float-gentle" opacity="0.18" fill="#fbbf24">
          <path d="M860 185c-24 0-42 18-44 43-18 3-31 19-31 38 0 18 12 33 28 37 2 18 14 34 31 41-5 19-16 32-31 35-10 2-17 11-15 21 2 9 11 15 20 13 28-6 48-28 53-61 6-1 12-4 17-8 16 14 38 11 49-7 8-13 6-30-5-41 11-10 15-26 9-41-8-19-28-31-49-29-8-22-21-41-32-41Z"/>
          <path d="M740 520 Q860 465 980 520 Q920 555 860 545 Q800 555 740 520Z" opacity="0.55"/>
        </g>
        <g class="myth-particles" fill="#fbbf24" opacity="0.35">
          <circle cx="210" cy="180" r="2"/><circle cx="380" cy="520" r="2.5"/><circle cx="670" cy="150" r="2"/><circle cx="1040" cy="490" r="2.5"/>
        </g>
      </svg>`;

    case 'hub':
      // Lord Ram & bow silhouette over cinematic battlefield horizon
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="ramHorizon" cx="76%" cy="42%" r="55%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22"/>
            <stop offset="55%" stop-color="#ea580c" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#ramHorizon)"/>
        <g class="myth-drift-slow" opacity="0.17" stroke="#fbbf24" fill="none" stroke-width="1.6">
          <path d="M905 115 C985 210 985 385 905 485" stroke-width="2.4"/>
          <line x1="905" y1="115" x2="905" y2="485" stroke-dasharray="3 3"/>
          <line x1="815" y1="300" x2="1015" y2="270" stroke-width="2"/>
          <polygon points="1020,269 1004,263 1007,277" fill="#fbbf24"/>
        </g>
        <g class="myth-float-gentle" opacity="0.16" fill="#f59e0b">
          <path d="M845 205c14 0 25 11 25 25v24l36 28-14 18-24-18v88l22 108h-28l-16-82-18 82h-28l22-108v-90l-34 26-14-18 44-36v-21c0-14 11-25 29-24Z"/>
          <path d="M0 615 Q320 565 650 605 T1200 585 L1200 720 L0 720Z" fill="#0d1526" opacity="0.85"/>
        </g>
        <g class="myth-particles" fill="#f59e0b" opacity="0.4">
          <circle cx="280" cy="220" r="2"/><circle cx="520" cy="490" r="2"/><circle cx="760" cy="180" r="2.5"/><circle cx="1090" cy="420" r="2"/>
        </g>
      </svg>`;

    case 'setup':
      // Lord Krishna & Kurukshetra chakra / chariot wheel
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="krishnaGlow" cx="78%" cy="32%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.16"/>
            <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#krishnaGlow)"/>
        <g class="myth-spin-slow" style="transform-origin:920px 260px" opacity="0.18" stroke="#f59e0b" fill="none" stroke-width="1.5">
          <circle cx="920" cy="260" r="140"/>
          <circle cx="920" cy="260" r="95" stroke-dasharray="10 8"/>
          <line x1="780" y1="260" x2="1060" y2="260"/>
          <line x1="920" y1="120" x2="920" y2="400"/>
          <line x1="821" y1="161" x2="1019" y2="359"/>
          <line x1="1019" y1="161" x2="821" y2="359"/>
        </g>
        <g class="myth-float-gentle" opacity="0.15" fill="#38bdf8">
          <path d="M120 620 Q420 555 760 605 T1200 565 L1200 720 L0 720Z"/>
        </g>
      </svg>`;

    case 'matches':
      // Lord Shiva & Mount Kailash trident & peaks
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="shivaMist" cx="72%" cy="28%" r="55%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.18"/>
            <stop offset="60%" stop-color="#38bdf8" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#shivaMist)"/>
        <g opacity="0.16" fill="#1e293b">
          <polygon points="480,720 790,290 1120,720"/>
          <polygon points="750,720 980,360 1220,720" opacity="0.7"/>
        </g>
        <g class="myth-float-gentle" opacity="0.2" stroke="#a78bfa" fill="none" stroke-width="2">
          <line x1="950" y1="120" x2="950" y2="440"/>
          <path d="M915 170 C915 225 985 225 985 170"/>
          <path d="M936 270 C950 285 964 270 950 255 C936 270 950 285 964 270"/>
        </g>
      </svg>`;

    case 'contacts':
      // Lord Vishnu & cosmic ocean waves
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="vishnuOcean" cx="75%" cy="35%" r="52%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.18"/>
            <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#vishnuOcean)"/>
        <g class="myth-drift-slow" opacity="0.18" stroke="#38bdf8" fill="none" stroke-width="1.8">
          <path d="M0 540 Q150 500 300 540 T600 540 T900 540 T1200 540"/>
          <path d="M0 585 Q150 545 300 585 T600 585 T900 585 T1200 585" opacity="0.7"/>
          <path d="M0 630 Q150 590 300 630 T600 630 T900 630 T1200 630" opacity="0.45"/>
        </g>
        <circle class="myth-float-gentle" cx="890" cy="240" r="95" stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="8 8" fill="none" opacity="0.2"/>
      </svg>`;

    case 'about':
      // Cosmic conch & celestial VARCHAS mandala
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <radialGradient id="aboutMandala" cx="76%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.16"/>
          <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#070b14" stop-opacity="0"/>
        </radialGradient>
        <rect width="1200" height="720" fill="url(#aboutMandala)"/>
        <g class="myth-spin-slow" style="transform-origin:880px 330px" opacity="0.16" stroke="#fbbf24" fill="none" stroke-width="1.3">
          <circle cx="880" cy="330" r="190" stroke-dasharray="4 12"/>
          <circle cx="880" cy="330" r="145"/>
          <polygon points="880,155 1031,417 729,417"/>
          <polygon points="880,505 1031,243 729,243"/>
        </g>
      </svg>`;

    case 'history':
      // Victory Stambha & subtle embers
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g opacity="0.13" fill="#f59e0b">
          <rect x="920" y="180" width="54" height="440" rx="6"/>
          <rect x="895" y="155" width="104" height="28" rx="4"/>
          <rect x="875" y="610" width="144" height="40" rx="4"/>
        </g>
      </svg>`;

    case 'settings':
      // Sacred geometric Vastu matrix
      return `<svg class="myth-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="myth-drift-slow" opacity="0.14" stroke="#38bdf8" fill="none" stroke-width="1.2">
          <rect x="760" y="180" width="240" height="240" transform="rotate(45 880 300)"/>
          <rect x="785" y="205" width="190" height="190"/>
          <circle cx="880" cy="300" r="120"/>
        </g>
      </svg>`;

    case 'controller':
    default:
      return '';
  }
}

export function renderMythologyBackdrop(container: HTMLElement, scene: MythSceneId): void {
  container.dataset.scene = scene;
  container.innerHTML = sceneSvg(scene);
}
