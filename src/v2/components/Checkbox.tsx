import {
  Checkbox as BaseCheckbox,
  type CheckboxProps,
} from "react-aria-components";

export function Checkbox({ children, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox {...props}>
      {({ isIndeterminate, isSelected }) => (
        <>
          <div
            className={`text-2xl ${isSelected ? "text-blue-600" : "text-gray-500"}`}
          >
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isSelected ? (
                <path
                  fill="currentColor"
                  d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-9 14l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8z"
                />
              ) : (
                <path
                  fill="currentColor"
                  d="M19 5v14H5V5zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2"
                />
              )}
            </svg>
          </div>
          {children}
        </>
      )}
    </BaseCheckbox>
  );
}
