import type { SVGProps } from "react";

/** Material "dark_mode" (moon). */
export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 21q-3.75 0-6.375-2.625T3 12q0-3.75 2.625-6.375T12 3q.35 0 .688.025t.662.075q-1.025.725-1.638 1.888T11.1 7.5q0 2.25 1.575 3.825T16.5 12.9q1.375 0 2.525-.613T20.9 10.65q.05.325.075.662T21 12q0 3.75-2.625 6.375T12 21"
      />
    </svg>
  );
}

/** Material "light_mode" (sun). */
export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12t-1.463 3.538T12 17m-8-4H1v-2h3zm19 0h-3v-2h3zM11 4V1h2v3zm0 19v-3h2v3zM6.4 7.75L4.575 5.95l1.4-1.45L7.75 6.3zM18 19.5l-1.775-1.8L17.6 16.25l1.825 1.8zm-1.8-13.2l1.8-1.775L19.45 5.9L17.65 7.7zM4.55 18.025L6.35 16.25L7.75 17.65l-1.8 1.775z"
      />
    </svg>
  );
}
