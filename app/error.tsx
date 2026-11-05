"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="load-screen">
      <h1>Something interrupted your brief.</h1>
      <p>Your saved preferences are still in this browser.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
