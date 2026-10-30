// Official Vibix/Rendex SDKs are needed only on movie pages, not site-wide.
// React hoists async scripts into <head> and deduplicates them by src, as Vibix requires.
export default function MovieLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script src="https://graphicslab.io/sdk/v2/rendex-sdk.min.js" async />
      <script src="https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js" async />
      {children}
    </>
  );
}
