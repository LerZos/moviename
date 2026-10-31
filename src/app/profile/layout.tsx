import CleanDocumentGuard from "../components/CleanDocumentGuard";

// Sign-in and account forms must never render in a document where the movie-only player SDK already ran.
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <CleanDocumentGuard>{children}</CleanDocumentGuard>;
}
