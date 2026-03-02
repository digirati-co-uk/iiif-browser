import type { SVGProps } from "react";

interface TypeIconProps {
  type:
    | Omit<string, "folder" | "manifest" | "collection">
    | "folder"
    | "manifest"
    | "collection";
  isFolder?: boolean;
  external?: boolean;
  noFill?: boolean;
  className?: string;
}

export const PortalResourceIcon = ({
  type,
  isFolder,
  external,
  noFill,
  className,
}: TypeIconProps) => {
  const muted = external ? "#a1a1a1" : "";

  if (isFolder) {
    type = "folder";
  }

  switch (type.toLowerCase()) {
    case "folder":
      return (
        <FolderIcon
          fill={noFill ? "currentColor" : muted || "#FFD075"}
          className={`${className} shrink-0 text-2xl`}
        />
      );
    case "manifest":
      return (
        <ManifestIcon
          fill={noFill ? "currentColor" : muted || "#C63E75"}
          className={`${className} shrink-0 text-2xl`}
        />
      );
    case "collection":
      return (
        <CollectionIcon
          fill={noFill ? "currentColor" : muted || "#31539F"}
          className={`${className} shrink-0 text-2xl`}
        />
      );
    default:
      return (
        <CanvasIcon
          fill={noFill ? "currentColor" : muted || "#F58962"}
          className={`${className} shrink-0 text-2xl`}
        />
      );
  }
};

const CanvasIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="#5f6368"
    viewBox="0 -960 960 960"
    aria-label="canvas"
    role="img"
    {...props}
  >
    <path d="M603-160h56v-83l102-24q21-5 43.5-11.5T827-299q0-8-8-14.5T792-326q-38-11-58-34t-18-49q2-21 19.5-37.5T785-474q28-10 41.5-22.5T840-526q0-20-17-30.5t-37-3.5q-6 2-12.5 3t-12.5 1q-26 0-43.5-20T700-625q0-26 13.5-47.5T727-720q0-17-14.5-28.5T677-760q-29 0-40.5 12.5T625-700q0 17 1.5 33t1.5 33q0 45-16 66t-50 21q-11 0-23-3t-23-3q-6 0-9.5 2.5T503-543q0 10 12 20t23 19q26 23 38 44t12 42q0 27-19.5 46T521-353q-11 0-21-2t-21-3q-28-2-43 5t-15 21q0 14 13 23t38 13l131 21v115Zm-450 40-73-33 200-440 73 33-200 440Zm370 40v-128l-57-8q-55-8-89.5-39.5T342-329q0-48 39.5-80.5T476-439q5 0 8.5.5t7.5 1.5q-8-8-15-14.5T464-465q-20-22-29-40.5t-9-37.5q0-38 21.5-62.5T504-630q7 0 19 .5t26 2.5q2-20 0-41t-2-41q0-63 34-97t97-34q56 0 93.5 32t36.5 78q0 23-8 45t-18 43q5-1 10.5-1.5t10.5-.5q48 0 82.5 34.5T920-525q0 43-30.5 77.5T818-402q7 2 13 4t12 5q29 14 47 39.5t18 55.5q0 38-33.5 66.5T779-188l-40 10v98H523ZM138-537q-29-29-43.5-65.5T80-679q0-84 58-142.5T280-880q40 0 76.5 15t65.5 44l-56 56q-17-17-39.5-26t-46.5-9q-50 0-85 35t-35 85q0 24 9 46.5t26 39.5l-57 57Zm493 128Z" />
  </svg>
);

const CollectionIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 -960 960 960"
    aria-label="collection"
    role="img"
    {...props}
  >
    <path d="M320-320h480v-480h-80v280l-100-60-100 60v-280H320v480Zm0 80q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm360-720h200-200Zm-200 0h480-480Z" />
  </svg>
);

const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="75 -910 960 960"
    aria-label="folder"
    role="img"
    {...props}
  >
    <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
  </svg>
);

const ManifestIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="20 -910 960 960"
    aria-label="manifest"
    role="img"
    {...props}
  >
    <path d="M480-160q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740v484q51-32 107-48t113-16q36 0 70.5 6t69.5 18v-480q15 5 29.5 10.5T898-752q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59Zm80-200v-380l200-200v400L560-360Zm-160 65v-396q-33-14-68.5-21.5T260-720q-37 0-72 7t-68 21v397q35-13 69.5-19t70.5-6q36 0 70.5 6t69.5 19Zm0 0v-396 396Z" />
  </svg>
);
