/**
 * Functionele iconen, geen decoratie.
 *
 * De padgegevens komen letterlijk uit Google's Material Symbols (Apache 2.0), maar worden hier
 * als losse SVG's ingebed in plaats van als lettertype geladen: het volledige subset-lettertype
 * weegt enkele megabytes voor een handvol glyphs, en er gaat zo geen bezoekersverzoek naar
 * Google — dezelfde overweging als bij Playfair en Inter in `app/layout.tsx`.
 *
 * Terughoudend gebruikt: alleen waar het icoon een handeling of status verduidelijkt die de
 * tekst alleen niet snel genoeg overbrengt (waarschuwen, kopiëren, tonen/verbergen, opnieuw
 * synchroniseren). Geen icoon als versiering naast een label dat zichzelf al uitlegt.
 */

type IcoonProps = {
  className?: string;
};

const VIEWBOX = "0 -960 960 960";

export function WaarschuwingIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="m40-120 440-760 440 760H40Zm104-60h672L480-760 144-180Zm361.5-65.68q8.5-8.67 8.5-21.5 0-12.82-8.68-21.32-8.67-8.5-21.5-8.5-12.82 0-21.32 8.68-8.5 8.67-8.5 21.5 0 12.82 8.68 21.32 8.67 8.5 21.5 8.5 12.82 0 21.32-8.68ZM454-348h60v-224h-60v224Zm26-122Z" />
    </svg>
  );
}

export function SyncIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M167-160v-60h130l-15-12q-64-51-93-111t-29-134q0-106 62.5-190.5T387-784v62q-75 29-121 96.5T220-477q0 63 23.5 109.5T307-287l30 21v-124h60v230H167Zm407-15v-63q76-29 121-96.5T740-483q0-48-23.5-97.5T655-668l-29-26v124h-60v-230h230v60H665l15 14q60 56 90 120t30 123q0 106-62 191T574-175Z" />
    </svg>
  );
}

export function KopieerIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M300-200q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h440q24 0 42 18t18 42v560q0 24-18 42t-42 18H300Zm0-60h440v-560H300v560ZM180-80q-24 0-42-18t-18-42v-620h60v620h500v60H180Zm120-180v-560 560Z" />
    </svg>
  );
}

export function OogIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M480-330q70 0 120-49.5T650-500q0-70-50-119.5T480-670q-71 0-120.5 49.5T310-500q0 71 49.5 120.5T480-330Zm0-72q-39 0-66.5-28T386-500q0-39 27.5-66.5T480-594q39 0 66.5 27.5T574-500q0 40-27.5 68T480-402Zm0 174q-146 0-264-83T40-500q58-134 176-217t264-83q146 0 264 83t176 217q-58 134-176 217t-264 83Zm0-300Zm0 240q121 0 222.5-65.5T857-500q-54-109-155.5-174.5T480-740q-121 0-222.5 65.5T102-500q54 109 155.5 174.5T480-260Z" />
    </svg>
  );
}

export function DownloadIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M480-313 287-506l43-43 120 120v-371h60v371l120-120 43 43-193 193ZM220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Z" />
    </svg>
  );
}

export function InfoIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M453-280h60v-240h-60v240Zm50.5-323.2q9.5-9.2 9.5-22.8 0-14.45-9.48-24.22-9.48-9.78-23.5-9.78t-23.52 9.78Q447-640.45 447-626q0 13.6 9.48 22.8 9.48 9.2 23.5 9.2t23.52-9.2ZM480.27-80q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" />
    </svg>
  );
}

export function OogDichtIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="m629-419-44-44q26-71-27-118t-115-24l-44-44q17-11 38-16t43-5q71 0 120.5 49.5T650-500q0 22-5.5 43.5T629-419Zm129 129-40-40q49-36 85.5-80.5T857-500q-50-111-150-175.5T490-740q-42 0-86 8t-69 19l-46-47q35-16 89.5-28T485-800q143 0 261.5 81.5T920-500q-26 64-67 117t-95 93Zm58 226L648-229q-35 14-79 21.5t-89 7.5q-146 0-265-81.5T40-500q20-52 55.5-101.5T182-696L56-822l42-43 757 757-39 44ZM223-654q-37 27-71.5 71T102-500q51 111 153.5 175.5T488-260q33 0 65-4t48-12l-64-64q-11 5-27 7.5t-30 2.5q-70 0-120-49t-50-121q0-15 2.5-30t7.5-27l-97-97Zm305 142Zm-116 58Z" />
    </svg>
  );
}
