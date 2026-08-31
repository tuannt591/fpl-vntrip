// Shared outer width and horizontal gutter for the three primary app pages.
export const primaryPageContainerClassName =
  "mx-auto w-full max-w-5xl px-2 sm:px-4";

export const chatPageLayoutClassName =
  `flex min-h-0 flex-1 flex-col ${primaryPageContainerClassName} pt-2 sm:pb-5 sm:pt-4 [&>section]:rounded-t-3xl [&>section]:border-x [&>section]:border-t sm:[&>section]:rounded-3xl sm:[&>section]:border`;
