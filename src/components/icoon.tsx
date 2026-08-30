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

import type { ComponentType } from "react";

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

export function BestuurIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z" />
    </svg>
  );
}

export function HuisIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
    </svg>
  );
}

export function GebouwIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M120-120v-560h160v-160h400v320h160v400H520v-160h-80v160H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z" />
    </svg>
  );
}

export function BetalingenIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-440h80v440h680v80ZM280-400v-320 320Z" />
    </svg>
  );
}

export function DatabaseIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M480-120q-151 0-255.5-46.5T120-280v-400q0-66 105.5-113T480-840q149 0 254.5 47T840-680v400q0 67-104.5 113.5T480-120Zm0-479q89 0 179-25.5T760-679q-11-29-100.5-55T480-760q-91 0-178.5 25.5T200-679q14 30 101.5 55T480-599Zm0 199q42 0 81-4t74.5-11.5q35.5-7.5 67-18.5t57.5-25v-120q-26 14-57.5 25t-67 18.5Q600-528 561-524t-81 4q-42 0-82-4t-75.5-11.5Q287-543 256-554t-56-25v120q25 14 56 25t66.5 18.5Q358-408 398-404t82 4Zm0 200q46 0 93.5-7t87.5-18.5q40-11.5 67-26t32-29.5v-98q-26 14-57.5 25t-67 18.5Q600-328 561-324t-81 4q-42 0-82-4t-75.5-11.5Q287-343 256-354t-56-25v99q5 15 31.5 29t66.5 25.5q40 11.5 88 18.5t94 7Z" />
    </svg>
  );
}

export function GroepenIcoon({ className = "h-4 w-4" }: IcoonProps) {
  return (
    <svg aria-hidden viewBox={VIEWBOX} className={className} fill="currentColor">
      <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z" />
    </svg>
  );
}

/**
 * Eén icoon per rol, zodat "Jouw bril" in de lobby ook zonder de naam te lezen al een signaal
 * geeft welke blik je meebrengt. Los van `content/spel/rollen.json` gehouden — dat bestand is
 * puur speltekst, dit is presentatie — maar de sleutels moeten wel gelijk blijven aan `rol.id`.
 */
const ROL_ICONEN: Record<string, ComponentType<IcoonProps>> = {
  bestuurder: BestuurIcoon,
  "manager-wonen": HuisIcoon,
  "manager-vastgoed": GebouwIcoon,
  "manager-financien": BetalingenIcoon,
  informatiemanager: DatabaseIcoon,
  huurdersvertegenwoordiger: GroepenIcoon,
};

export function RolIcoon({ rolId, className = "h-4 w-4" }: IcoonProps & { rolId: string }) {
  const Icoon = ROL_ICONEN[rolId];
  return Icoon ? <Icoon className={className} /> : null;
}
